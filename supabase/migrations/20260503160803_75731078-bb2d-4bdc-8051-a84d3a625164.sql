ALTER TABLE public.admissoes_movimentacao
  ADD COLUMN IF NOT EXISTS data_abertura date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS data_final date,
  ADD COLUMN IF NOT EXISTS turno text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aberta';

ALTER TABLE public.admissoes_movimentacao
  ALTER COLUMN colaborador_id DROP NOT NULL,
  ALTER COLUMN colaborador_nome DROP NOT NULL,
  ALTER COLUMN data_admissao DROP NOT NULL;
