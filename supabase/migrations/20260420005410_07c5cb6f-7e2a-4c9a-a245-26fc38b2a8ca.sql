-- 1. Add introducao to pesquisas
ALTER TABLE public.pesquisas
  ADD COLUMN IF NOT EXISTS introducao TEXT;

-- 2. Enum for pergunta tipo
DO $$ BEGIN
  CREATE TYPE public.pergunta_tipo AS ENUM ('nota_0_10', 'escolha_unica', 'escolha_multipla', 'texto_curto', 'texto_longo');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Perguntas table
CREATE TABLE IF NOT EXISTS public.pesquisa_perguntas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pesquisa_id UUID NOT NULL REFERENCES public.pesquisas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  tipo public.pergunta_tipo NOT NULL DEFAULT 'nota_0_10',
  opcoes JSONB,
  obrigatoria BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pesquisa_perguntas_pesquisa ON public.pesquisa_perguntas(pesquisa_id, ordem);

ALTER TABLE public.pesquisa_perguntas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perguntas leitura publica" ON public.pesquisa_perguntas;
CREATE POLICY "Perguntas leitura publica" ON public.pesquisa_perguntas
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Perguntas insert admin gestor" ON public.pesquisa_perguntas;
CREATE POLICY "Perguntas insert admin gestor" ON public.pesquisa_perguntas
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

DROP POLICY IF EXISTS "Perguntas update admin gestor" ON public.pesquisa_perguntas;
CREATE POLICY "Perguntas update admin gestor" ON public.pesquisa_perguntas
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

DROP POLICY IF EXISTS "Perguntas delete admin gestor" ON public.pesquisa_perguntas;
CREATE POLICY "Perguntas delete admin gestor" ON public.pesquisa_perguntas
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- 4. Respostas item (resposta a uma pergunta específica)
CREATE TABLE IF NOT EXISTS public.respostas_item (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resposta_id UUID NOT NULL REFERENCES public.respostas_pesquisa(id) ON DELETE CASCADE,
  pergunta_id UUID NOT NULL REFERENCES public.pesquisa_perguntas(id) ON DELETE CASCADE,
  valor_nota SMALLINT,
  valor_texto TEXT,
  valor_opcoes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_respostas_item_resposta ON public.respostas_item(resposta_id);
CREATE INDEX IF NOT EXISTS idx_respostas_item_pergunta ON public.respostas_item(pergunta_id);

ALTER TABLE public.respostas_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Resp item insert publico se aberta" ON public.respostas_item;
CREATE POLICY "Resp item insert publico se aberta" ON public.respostas_item
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.respostas_pesquisa r
    JOIN public.pesquisas p ON p.id = r.pesquisa_id
    WHERE r.id = respostas_item.resposta_id AND p.status = 'aberta'
  ));

DROP POLICY IF EXISTS "Resp item select admin gestor" ON public.respostas_item;
CREATE POLICY "Resp item select admin gestor" ON public.respostas_item
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- 5. Make nota nullable on respostas_pesquisa (now optional - eNPS becomes one of the questions)
ALTER TABLE public.respostas_pesquisa
  ALTER COLUMN nota DROP NOT NULL;