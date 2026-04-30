-- Add status to ideias
CREATE TYPE public.ideia_status AS ENUM ('em_analise', 'em_andamento', 'aprovado', 'concluido', 'rejeitado');

ALTER TABLE public.ideias
  ADD COLUMN status public.ideia_status NOT NULL DEFAULT 'em_analise';

CREATE INDEX idx_ideias_status ON public.ideias(status);