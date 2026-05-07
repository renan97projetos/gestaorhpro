
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS bloqueada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plano text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS responsavel text,
  ADD COLUMN IF NOT EXISTS mrr numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS limite_usuarios integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS limite_vagas integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS ultimo_acesso timestamptz;

CREATE OR REPLACE FUNCTION public.touch_empresa_acesso(_empresa uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.empresas SET ultimo_acesso = now() WHERE id = _empresa;
$$;

GRANT EXECUTE ON FUNCTION public.touch_empresa_acesso(uuid) TO authenticated;
