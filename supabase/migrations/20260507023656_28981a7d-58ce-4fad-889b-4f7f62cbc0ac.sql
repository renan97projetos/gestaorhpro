
-- 1. Curriculos bucket: make private
UPDATE storage.buckets SET public = false WHERE id = 'curriculos';

-- Replace public read on curriculos with manager-only access
DROP POLICY IF EXISTS "Curriculos public read" ON storage.objects;
CREATE POLICY "Curriculos read empresa manager"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'curriculos'
  AND EXISTS (
    SELECT 1 FROM public.vaga_candidatos vc
    JOIN public.admissoes_movimentacao v ON v.id = vc.vaga_id
    WHERE vc.curriculo_url IS NOT NULL
      AND position(storage.objects.name in vc.curriculo_url) > 0
      AND public.is_empresa_member(auth.uid(), v.empresa_id)
  )
  OR public.is_admin_mestre(auth.uid())
);
-- Keep upload open (applicants are anonymous), but only into curriculos
DROP POLICY IF EXISTS "Curriculos public upload" ON storage.objects;
CREATE POLICY "Curriculos upload publico"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'curriculos');

-- 2. Empresa-assets: restrict update/delete to managers of the owning empresa
-- Files are stored under "{empresa_id}/..."
DROP POLICY IF EXISTS "Empresa assets delete autenticado" ON storage.objects;
DROP POLICY IF EXISTS "Empresa assets update autenticado" ON storage.objects;
CREATE POLICY "Empresa assets delete por manager"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'empresa-assets'
  AND (
    public.is_admin_mestre(auth.uid())
    OR public.can_manage_empresa(
        auth.uid(),
        NULLIF((storage.foldername(name))[1], '')::uuid
    )
  )
);
CREATE POLICY "Empresa assets update por manager"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'empresa-assets'
  AND (
    public.is_admin_mestre(auth.uid())
    OR public.can_manage_empresa(
        auth.uid(),
        NULLIF((storage.foldername(name))[1], '')::uuid
    )
  )
);

-- 3. Vagas: public select only when explicitly published
DROP POLICY IF EXISTS "Vagas select publico token ou publicada" ON public.admissoes_movimentacao;
CREATE POLICY "Vagas select publico apenas publicada"
ON public.admissoes_movimentacao FOR SELECT TO anon, authenticated
USING (status = 'aberta' AND publicada = true);

-- 4. vaga_candidatos: public insert only on aberta + publicada vagas
DROP POLICY IF EXISTS "Cand insert publico vaga aberta" ON public.vaga_candidatos;
CREATE POLICY "Cand insert publico vaga publicada"
ON public.vaga_candidatos FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admissoes_movimentacao v
    WHERE v.id = vaga_candidatos.vaga_id
      AND v.status = 'aberta'
      AND v.publicada = true
  )
);

-- 5. solicitacoes: scope SELECT
DROP POLICY IF EXISTS "Sol select autenticado" ON public.solicitacoes;
CREATE POLICY "Sol select escopado"
ON public.solicitacoes FOR SELECT TO authenticated
USING (
  auth.uid() = solicitante_id
  OR auth.uid() = aprovador_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gestor'::app_role)
);

-- 6. movimentacoes: scope SELECT to colaborador's empresa members
DROP POLICY IF EXISTS "Mov select autenticado" ON public.movimentacoes;
CREATE POLICY "Mov select por empresa"
ON public.movimentacoes FOR SELECT TO authenticated
USING (
  public.is_admin_mestre(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = movimentacoes.colaborador_id
      AND public.is_empresa_member(auth.uid(), c.empresa_id)
  )
);

-- 7. admissoes_historico: scope SELECT to empresa members
DROP POLICY IF EXISTS "AdmHist select autenticado" ON public.admissoes_historico;
CREATE POLICY "AdmHist select por empresa"
ON public.admissoes_historico FOR SELECT TO authenticated
USING (
  public.is_admin_mestre(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.admissoes_movimentacao m
    WHERE m.id = admissoes_historico.movimentacao_id
      AND public.is_empresa_member(auth.uid(), m.empresa_id)
  )
);

-- 8. chamadas: scope SELECT and UPDATE
DROP POLICY IF EXISTS "Chamadas select autenticado" ON public.chamadas;
DROP POLICY IF EXISTS "Chamadas update autenticado" ON public.chamadas;
CREATE POLICY "Chamadas select por empresa"
ON public.chamadas FOR SELECT TO authenticated
USING (
  public.is_admin_mestre(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = chamadas.colaborador_id
      AND public.is_empresa_member(auth.uid(), c.empresa_id)
  )
);
CREATE POLICY "Chamadas update por empresa"
ON public.chamadas FOR UPDATE TO authenticated
USING (
  public.is_admin_mestre(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = chamadas.colaborador_id
      AND public.is_empresa_member(auth.uid(), c.empresa_id)
  )
);

-- 9. pesquisas: public read only when aberta (token still readable, kept for tokenized survey response flow)
DROP POLICY IF EXISTS "Pesquisas leitura publica" ON public.pesquisas;
CREATE POLICY "Pesquisas leitura publica abertas"
ON public.pesquisas FOR SELECT TO anon, authenticated
USING (status = 'aberta'::pesquisa_status OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role));

-- 10. Realtime: require authentication on realtime.messages
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Realtime authenticated only" ON realtime.messages;
CREATE POLICY "Realtime authenticated only"
ON realtime.messages FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- 11. Revoke EXECUTE on internal SECURITY DEFINER helpers from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.is_admin_mestre(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_empresa_member(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_empresa_role(uuid, uuid, public.empresa_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_empresa(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_empresa(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
