
CREATE TABLE public.avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  resumo text NOT NULL,
  conteudo text,
  criticidade text NOT NULL DEFAULT 'info',
  empresa_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_by_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avisos select" ON public.avisos FOR SELECT TO authenticated
USING (
  ativo = true AND (
    empresa_id IS NULL
    OR is_admin_mestre(auth.uid())
    OR is_empresa_member(auth.uid(), empresa_id)
  )
);
CREATE POLICY "Avisos insert mestre" ON public.avisos FOR INSERT TO authenticated
WITH CHECK (is_admin_mestre(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY "Avisos update mestre" ON public.avisos FOR UPDATE TO authenticated
USING (is_admin_mestre(auth.uid()));
CREATE POLICY "Avisos delete mestre" ON public.avisos FOR DELETE TO authenticated
USING (is_admin_mestre(auth.uid()));

CREATE TRIGGER tg_avisos_updated_at BEFORE UPDATE ON public.avisos
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.avisos_leituras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aviso_id uuid NOT NULL REFERENCES public.avisos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  lido_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(aviso_id, user_id)
);
ALTER TABLE public.avisos_leituras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leituras select proprio" ON public.avisos_leituras FOR SELECT TO authenticated
USING (auth.uid() = user_id OR is_admin_mestre(auth.uid()));
CREATE POLICY "Leituras insert proprio" ON public.avisos_leituras FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leituras delete proprio" ON public.avisos_leituras FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_avisos_ativo_created ON public.avisos(ativo, created_at DESC);
CREATE INDEX idx_avisos_leituras_user ON public.avisos_leituras(user_id, aviso_id);
