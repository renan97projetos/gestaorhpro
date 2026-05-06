-- Colunas extras na vaga
ALTER TABLE public.admissoes_movimentacao
  ADD COLUMN IF NOT EXISTS link_token text UNIQUE DEFAULT encode(extensions.gen_random_bytes(8), 'hex'),
  ADD COLUMN IF NOT EXISTS salario numeric(10,2),
  ADD COLUMN IF NOT EXISTS cargo_oferecido text;

UPDATE public.admissoes_movimentacao SET link_token = encode(extensions.gen_random_bytes(8),'hex') WHERE link_token IS NULL;

-- Tabela de candidatos
CREATE TABLE IF NOT EXISTS public.vaga_candidatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id uuid NOT NULL REFERENCES public.admissoes_movimentacao(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  cidade text,
  endereco text,
  curriculo_url text,
  etapa text NOT NULL DEFAULT 'inscrito', -- inscrito, triagem, entrevista, admissao, reprovado
  origem text NOT NULL DEFAULT 'manual', -- manual | link
  observacao text,
  cargo_oferecido text,
  salario numeric(10,2),
  data_inicio date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vaga_candidatos ENABLE ROW LEVEL SECURITY;

-- Inscrição pública (anon ou auth) — desde que vaga esteja aberta
CREATE POLICY "Cand insert publico vaga aberta"
  ON public.vaga_candidatos FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admissoes_movimentacao v
            WHERE v.id = vaga_candidatos.vaga_id AND v.status = 'aberta')
  );

CREATE POLICY "Cand select autenticado"
  ON public.vaga_candidatos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Cand update admin gestor"
  ON public.vaga_candidatos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'));

CREATE POLICY "Cand delete admin gestor"
  ON public.vaga_candidatos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestor'));

CREATE TRIGGER trg_vaga_cand_updated
  BEFORE UPDATE ON public.vaga_candidatos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_vaga_candidatos_vaga ON public.vaga_candidatos(vaga_id);

-- Permitir leitura pública da vaga via token (para a página de candidatura)
-- Já existe SELECT autenticado true; público só precisa ver via consulta filtrada por token
CREATE POLICY "Vaga select publico por token"
  ON public.admissoes_movimentacao FOR SELECT TO anon
  USING (status = 'aberta');

-- Storage bucket público para currículos
INSERT INTO storage.buckets (id, name, public)
VALUES ('curriculos', 'curriculos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Curriculos public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'curriculos');

CREATE POLICY "Curriculos public upload"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'curriculos');