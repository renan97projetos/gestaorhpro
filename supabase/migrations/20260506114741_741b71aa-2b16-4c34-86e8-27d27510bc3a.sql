-- 1. Coluna tem_filho em colaboradores
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS tem_filho text;

-- 2. Tabela de notas privadas do período de experiência
CREATE TABLE IF NOT EXISTS public.experiencia_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_nome text,
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.experiencia_notas ENABLE ROW LEVEL SECURITY;

-- Apenas admin e gestor podem inserir, e apenas suas próprias notas
CREATE POLICY "Exp notas insert admin gestor proprio"
  ON public.experiencia_notas FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'))
  );

-- Cada admin/gestor só vê as suas próprias anotações
CREATE POLICY "Exp notas select proprio admin gestor"
  ON public.experiencia_notas FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'))
  );

CREATE POLICY "Exp notas update proprio"
  ON public.experiencia_notas FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Exp notas delete proprio"
  ON public.experiencia_notas FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_exp_notas_updated
  BEFORE UPDATE ON public.experiencia_notas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();