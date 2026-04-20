-- Tipos
CREATE TYPE public.pesquisa_tipo AS ENUM ('enps', 'clima', 'lideranca', 'pulse');
CREATE TYPE public.pesquisa_status AS ENUM ('aberta', 'fechada');

-- Tabela pesquisas
CREATE TABLE public.pesquisas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  tipo public.pesquisa_tipo NOT NULL DEFAULT 'enps',
  status public.pesquisa_status NOT NULL DEFAULT 'aberta',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_by uuid
);

ALTER TABLE public.pesquisas ENABLE ROW LEVEL SECURITY;

-- Leitura pública (necessária para formulário anônimo carregar título/status)
CREATE POLICY "Pesquisas leitura publica"
ON public.pesquisas FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Pesquisas insert admin gestor"
ON public.pesquisas FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Pesquisas update admin gestor"
ON public.pesquisas FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Pesquisas delete admin"
ON public.pesquisas FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Tabela respostas
CREATE TABLE public.respostas_pesquisa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id uuid NOT NULL REFERENCES public.pesquisas(id) ON DELETE CASCADE,
  nota smallint NOT NULL CHECK (nota >= 0 AND nota <= 10),
  comentario text,
  setor text,
  lideranca text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_respostas_pesquisa_id ON public.respostas_pesquisa(pesquisa_id);

ALTER TABLE public.respostas_pesquisa ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode inserir resposta SE a pesquisa estiver aberta
CREATE POLICY "Respostas insert publico se aberta"
ON public.respostas_pesquisa FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pesquisas p
    WHERE p.id = pesquisa_id AND p.status = 'aberta'
  )
);

-- Apenas admin/gestor leem as respostas
CREATE POLICY "Respostas select admin gestor"
ON public.respostas_pesquisa FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- Realtime
ALTER TABLE public.pesquisas REPLICA IDENTITY FULL;
ALTER TABLE public.respostas_pesquisa REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pesquisas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.respostas_pesquisa;