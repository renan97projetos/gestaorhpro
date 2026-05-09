
-- =========================================================
-- 1. Storage bucket: make documentos-admissao PRIVATE
-- =========================================================
UPDATE storage.buckets SET public = false WHERE id = 'documentos-admissao';

-- Drop existing open policies on storage.objects for this bucket
DROP POLICY IF EXISTS "DocAdm storage select publico" ON storage.objects;
DROP POLICY IF EXISTS "DocAdm storage insert publico" ON storage.objects;
DROP POLICY IF EXISTS "DocAdm storage delete autenticado" ON storage.objects;
DROP POLICY IF EXISTS "DocAdm storage update autenticado" ON storage.objects;

-- Empresa-scoped read access (members can read documents of candidates of their empresa)
CREATE POLICY "DocAdm storage select empresa"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documentos-admissao'
  AND (
    public.is_admin_mestre(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.vaga_candidatos c
      JOIN public.admissoes_movimentacao v ON v.id = c.vaga_id
      WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
        AND public.is_empresa_member(auth.uid(), v.empresa_id)
    )
  )
);

-- Empresa-scoped insert (HR users uploading on behalf of candidate)
CREATE POLICY "DocAdm storage insert empresa"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documentos-admissao'
  AND (
    public.is_admin_mestre(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.vaga_candidatos c
      JOIN public.admissoes_movimentacao v ON v.id = c.vaga_id
      WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
        AND public.can_edit_empresa(auth.uid(), v.empresa_id)
    )
  )
);

-- Empresa-scoped delete
CREATE POLICY "DocAdm storage delete empresa"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documentos-admissao'
  AND (
    public.is_admin_mestre(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.vaga_candidatos c
      JOIN public.admissoes_movimentacao v ON v.id = c.vaga_id
      WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
        AND public.can_edit_empresa(auth.uid(), v.empresa_id)
    )
  )
);

-- =========================================================
-- 2. admissao_documentos table: remove anon/public policies
-- =========================================================
DROP POLICY IF EXISTS "AdmDoc select publico via candidato" ON public.admissao_documentos;
DROP POLICY IF EXISTS "AdmDoc insert publico" ON public.admissao_documentos;

-- =========================================================
-- 3. pesquisa_perguntas: scope writes to parent pesquisa empresa
-- =========================================================
DROP POLICY IF EXISTS "Perguntas insert admin gestor" ON public.pesquisa_perguntas;
DROP POLICY IF EXISTS "Perguntas update admin gestor" ON public.pesquisa_perguntas;
DROP POLICY IF EXISTS "Perguntas delete admin gestor" ON public.pesquisa_perguntas;

CREATE POLICY "Perguntas insert por empresa"
ON public.pesquisa_perguntas FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pesquisas p
    WHERE p.id = pesquisa_perguntas.pesquisa_id
      AND public.can_edit_empresa(auth.uid(), p.empresa_id)
  )
);

CREATE POLICY "Perguntas update por empresa"
ON public.pesquisa_perguntas FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pesquisas p
    WHERE p.id = pesquisa_perguntas.pesquisa_id
      AND public.can_edit_empresa(auth.uid(), p.empresa_id)
  )
);

CREATE POLICY "Perguntas delete por empresa"
ON public.pesquisa_perguntas FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pesquisas p
    WHERE p.id = pesquisa_perguntas.pesquisa_id
      AND public.can_manage_empresa(auth.uid(), p.empresa_id)
  )
);

-- =========================================================
-- 4. experiencia_notas: scope by colaborador's empresa
-- =========================================================
DROP POLICY IF EXISTS "Exp notas insert admin gestor proprio" ON public.experiencia_notas;
DROP POLICY IF EXISTS "Exp notas select proprio admin gestor" ON public.experiencia_notas;
DROP POLICY IF EXISTS "Exp notas update proprio" ON public.experiencia_notas;
DROP POLICY IF EXISTS "Exp notas delete proprio" ON public.experiencia_notas;

CREATE POLICY "Exp notas select por empresa"
ON public.experiencia_notas FOR SELECT TO authenticated
USING (
  public.is_admin_mestre(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = experiencia_notas.colaborador_id
      AND public.can_edit_empresa(auth.uid(), c.empresa_id)
  )
);

CREATE POLICY "Exp notas insert por empresa"
ON public.experiencia_notas FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = experiencia_notas.colaborador_id
      AND public.can_edit_empresa(auth.uid(), c.empresa_id)
  )
);

CREATE POLICY "Exp notas update por empresa"
ON public.experiencia_notas FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = experiencia_notas.colaborador_id
      AND public.can_edit_empresa(auth.uid(), c.empresa_id)
  )
);

CREATE POLICY "Exp notas delete por empresa"
ON public.experiencia_notas FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = experiencia_notas.colaborador_id
      AND public.can_edit_empresa(auth.uid(), c.empresa_id)
  )
);

-- =========================================================
-- 5. touch_empresa_acesso: add membership guard
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_empresa_acesso(_empresa uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.is_admin_mestre(auth.uid()) OR public.is_empresa_member(auth.uid(), _empresa)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  UPDATE public.empresas SET ultimo_acesso = now() WHERE id = _empresa;
END;
$$;

-- =========================================================
-- 6. Revoke EXECUTE on internal SECURITY DEFINER helpers from anon/authenticated.
-- These are only called from RLS policies (which evaluate as the function owner)
-- and from triggers, so revoking direct EXECUTE does not break functionality.
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_admin_mestre(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_empresa_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_empresa_role(uuid, uuid, empresa_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_empresa(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_empresa(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tg_set_data_demissao() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_link_mestres_to_empresa() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_promote_initial_admins() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
