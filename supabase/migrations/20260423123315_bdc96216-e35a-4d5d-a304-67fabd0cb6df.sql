-- Tabela de ideias
CREATE TABLE public.ideias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  cargo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ideias ENABLE ROW LEVEL SECURITY;

-- SELECT: admin/gestor veem tudo, demais veem apenas as próprias
CREATE POLICY "Ideias select admin gestor todas"
ON public.ideias FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR auth.uid() = user_id
);

-- INSERT: qualquer usuário autenticado, mas precisa ser dono
CREATE POLICY "Ideias insert autenticado"
ON public.ideias FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- DELETE: apenas admin e gestor
CREATE POLICY "Ideias delete admin gestor"
ON public.ideias FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
);

-- UPDATE: apenas admin e gestor
CREATE POLICY "Ideias update admin gestor"
ON public.ideias FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
);

-- Trigger updated_at
CREATE TRIGGER tg_ideias_updated_at
BEFORE UPDATE ON public.ideias
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Index para performance
CREATE INDEX idx_ideias_user_id ON public.ideias(user_id);
CREATE INDEX idx_ideias_created_at ON public.ideias(created_at DESC);