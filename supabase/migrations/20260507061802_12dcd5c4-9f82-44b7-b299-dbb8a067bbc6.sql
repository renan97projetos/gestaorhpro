
CREATE TABLE public.base_conhecimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NULL,
  titulo text NOT NULL,
  descricao text,
  categoria text NOT NULL DEFAULT 'geral',
  conteudo text,
  video_url text,
  anexo_url text,
  tipo text NOT NULL DEFAULT 'treinamento',
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_by_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_base_conhecimento_empresa ON public.base_conhecimento(empresa_id);

ALTER TABLE public.base_conhecimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BaseCon select"
  ON public.base_conhecimento FOR SELECT TO authenticated
  USING (
    ativo = true AND (
      empresa_id IS NULL
      OR public.is_admin_mestre(auth.uid())
      OR public.is_empresa_member(auth.uid(), empresa_id)
    )
  );

CREATE POLICY "BaseCon insert mestre global"
  ON public.base_conhecimento FOR INSERT TO authenticated
  WITH CHECK (
    (empresa_id IS NULL AND public.is_admin_mestre(auth.uid()))
    OR (empresa_id IS NOT NULL AND public.can_edit_empresa(auth.uid(), empresa_id))
  );

CREATE POLICY "BaseCon update"
  ON public.base_conhecimento FOR UPDATE TO authenticated
  USING (
    (empresa_id IS NULL AND public.is_admin_mestre(auth.uid()))
    OR (empresa_id IS NOT NULL AND public.can_edit_empresa(auth.uid(), empresa_id))
  );

CREATE POLICY "BaseCon delete"
  ON public.base_conhecimento FOR DELETE TO authenticated
  USING (
    (empresa_id IS NULL AND public.is_admin_mestre(auth.uid()))
    OR (empresa_id IS NOT NULL AND public.can_manage_empresa(auth.uid(), empresa_id))
  );

CREATE TRIGGER trg_base_conhecimento_updated
  BEFORE UPDATE ON public.base_conhecimento
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
