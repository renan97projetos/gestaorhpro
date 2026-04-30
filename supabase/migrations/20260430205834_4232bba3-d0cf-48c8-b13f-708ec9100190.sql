ALTER TABLE public.colaboradores 
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT;

CREATE INDEX IF NOT EXISTS idx_colaboradores_cidade ON public.colaboradores(cidade);
CREATE INDEX IF NOT EXISTS idx_colaboradores_bairro ON public.colaboradores(bairro);