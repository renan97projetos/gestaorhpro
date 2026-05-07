
-- 1. Empresas: restringir colunas sensíveis para anônimos
DROP POLICY IF EXISTS "Empresas select publica ativa" ON public.empresas;

CREATE OR REPLACE VIEW public.empresas_publicas
WITH (security_invoker = on) AS
SELECT id, slug, nome, logo_url, capa_url, sobre, cor_primaria
FROM public.empresas
WHERE ativo = true;

GRANT SELECT ON public.empresas_publicas TO anon, authenticated;

-- 2. Chamadas: insert só para membros da empresa do colaborador
DROP POLICY IF EXISTS "Chamadas insert autenticado" ON public.chamadas;
CREATE POLICY "Chamadas insert por empresa"
ON public.chamadas FOR INSERT TO authenticated
WITH CHECK (
  is_admin_mestre(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = chamadas.colaborador_id
      AND is_empresa_member(auth.uid(), c.empresa_id)
  )
);

-- 3. Feedback respostas: validar campanha aberta
DROP POLICY IF EXISTS "Fb resp insert autenticado" ON public.feedback_respostas;
CREATE POLICY "Fb resp insert campanha aberta"
ON public.feedback_respostas FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.feedback_campanhas c
    WHERE c.id = feedback_respostas.campanha_id AND c.status = 'aberta'
  )
);

-- 4. Feedback itens: só para resposta do próprio usuário
DROP POLICY IF EXISTS "Fb item insert autenticado" ON public.feedback_resposta_itens;
CREATE POLICY "Fb item insert proprio"
ON public.feedback_resposta_itens FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.feedback_respostas r
    WHERE r.id = feedback_resposta_itens.resposta_id
      AND r.user_id = auth.uid()
  )
);

-- 5. Realtime: restringe a authenticated apenas (já está, mas garantimos)
-- Mantemos pois alteração mais granular requer mapeamento de tópicos.

-- 6. Storage: curriculos upload — exige nome com prefixo (vaga token / random)
DROP POLICY IF EXISTS "Curriculos upload publico" ON storage.objects;
CREATE POLICY "Curriculos upload com prefixo"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'curriculos'
  AND name ~ '^[a-zA-Z0-9_-]{6,}/'
);

-- 7. Storage: empresa-assets upload — só na pasta da empresa que gerencia
DROP POLICY IF EXISTS "Empresa assets upload autenticado" ON storage.objects;
CREATE POLICY "Empresa assets upload por gestor"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'empresa-assets'
  AND can_manage_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
