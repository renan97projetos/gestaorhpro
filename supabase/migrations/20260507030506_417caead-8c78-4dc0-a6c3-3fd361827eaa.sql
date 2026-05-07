
-- 1) feedback_campanhas: add empresa_id and scope RLS
ALTER TABLE public.feedback_campanhas ADD COLUMN IF NOT EXISTS empresa_id uuid;
UPDATE public.feedback_campanhas SET empresa_id = (SELECT id FROM public.empresas WHERE slug='grupo-real' LIMIT 1) WHERE empresa_id IS NULL;
ALTER TABLE public.feedback_campanhas ALTER COLUMN empresa_id SET NOT NULL;

DROP POLICY IF EXISTS "Fb camp select autenticado" ON public.feedback_campanhas;
DROP POLICY IF EXISTS "Fb camp insert admin gestor" ON public.feedback_campanhas;
DROP POLICY IF EXISTS "Fb camp update admin gestor" ON public.feedback_campanhas;
DROP POLICY IF EXISTS "Fb camp delete admin" ON public.feedback_campanhas;

CREATE POLICY "Fb camp select por empresa" ON public.feedback_campanhas FOR SELECT TO authenticated
  USING (public.is_admin_mestre(auth.uid()) OR public.is_empresa_member(auth.uid(), empresa_id));
CREATE POLICY "Fb camp insert por empresa" ON public.feedback_campanhas FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_empresa(auth.uid(), empresa_id) AND auth.uid() = created_by);
CREATE POLICY "Fb camp update por empresa" ON public.feedback_campanhas FOR UPDATE TO authenticated
  USING (public.can_edit_empresa(auth.uid(), empresa_id));
CREATE POLICY "Fb camp delete por empresa" ON public.feedback_campanhas FOR DELETE TO authenticated
  USING (public.can_manage_empresa(auth.uid(), empresa_id));

-- 2) feedback_perguntas: scope via parent campanha empresa
DROP POLICY IF EXISTS "Fb perg select autenticado" ON public.feedback_perguntas;
DROP POLICY IF EXISTS "Fb perg insert admin gestor" ON public.feedback_perguntas;
DROP POLICY IF EXISTS "Fb perg update admin gestor" ON public.feedback_perguntas;
DROP POLICY IF EXISTS "Fb perg delete admin gestor" ON public.feedback_perguntas;

CREATE POLICY "Fb perg select por empresa" ON public.feedback_perguntas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.feedback_campanhas c WHERE c.id = feedback_perguntas.campanha_id
    AND (public.is_admin_mestre(auth.uid()) OR public.is_empresa_member(auth.uid(), c.empresa_id))));
CREATE POLICY "Fb perg insert por empresa" ON public.feedback_perguntas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.feedback_campanhas c WHERE c.id = feedback_perguntas.campanha_id
    AND public.can_edit_empresa(auth.uid(), c.empresa_id)));
CREATE POLICY "Fb perg update por empresa" ON public.feedback_perguntas FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.feedback_campanhas c WHERE c.id = feedback_perguntas.campanha_id
    AND public.can_edit_empresa(auth.uid(), c.empresa_id)));
CREATE POLICY "Fb perg delete por empresa" ON public.feedback_perguntas FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.feedback_campanhas c WHERE c.id = feedback_perguntas.campanha_id
    AND public.can_manage_empresa(auth.uid(), c.empresa_id)));

-- 3) admissoes_movimentacao: drop public-all-columns SELECT, expose only safe fields via view
DROP POLICY IF EXISTS "Vagas select publico apenas publicada" ON public.admissoes_movimentacao;

CREATE OR REPLACE VIEW public.vagas_publicas WITH (security_invoker=on) AS
  SELECT id, empresa_id, cargo, setor, turno, descricao, link_token, data_abertura, created_at
  FROM public.admissoes_movimentacao
  WHERE status = 'aberta' AND publicada = true;

GRANT SELECT ON public.vagas_publicas TO anon, authenticated;

-- 4) pesquisa_perguntas: only expose questions of open surveys publicly
DROP POLICY IF EXISTS "Perguntas leitura publica" ON public.pesquisa_perguntas;
CREATE POLICY "Perguntas leitura publica abertas" ON public.pesquisa_perguntas FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.pesquisas p WHERE p.id = pesquisa_perguntas.pesquisa_id
    AND (p.status = 'aberta'::public.pesquisa_status OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gestor'::public.app_role))));

-- 5) curriculos upload: require valid open+publicada vaga whose id matches first folder
DROP POLICY IF EXISTS "Curriculos upload com prefixo" ON storage.objects;
CREATE POLICY "Curriculos upload vaga publicada" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'curriculos'
    AND EXISTS (
      SELECT 1 FROM public.admissoes_movimentacao v
      WHERE v.id::text = (storage.foldername(name))[1]
        AND v.status = 'aberta'
        AND v.publicada = true
    )
  );
