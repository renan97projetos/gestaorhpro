
-- 1) Adiciona colunas em vaga_candidatos
ALTER TABLE public.vaga_candidatos
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS doc_token TEXT UNIQUE DEFAULT encode(extensions.gen_random_bytes(12), 'hex');

-- garante token para candidatos existentes
UPDATE public.vaga_candidatos SET doc_token = encode(extensions.gen_random_bytes(12), 'hex') WHERE doc_token IS NULL;

-- 2) Tabela de documentos
CREATE TABLE IF NOT EXISTS public.admissao_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES public.vaga_candidatos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  nome_arquivo TEXT,
  url TEXT NOT NULL,
  storage_path TEXT,
  observacao TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admdoc_candidato ON public.admissao_documentos(candidato_id);

ALTER TABLE public.admissao_documentos ENABLE ROW LEVEL SECURITY;

-- SELECT: empresa do candidato OU mestre OU público (vamos usar anon para consulta via token+cpf via api)
CREATE POLICY "AdmDoc select por empresa"
ON public.admissao_documentos FOR SELECT
TO authenticated
USING (
  is_admin_mestre(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.vaga_candidatos c
    JOIN public.admissoes_movimentacao v ON v.id = c.vaga_id
    WHERE c.id = admissao_documentos.candidato_id
      AND is_empresa_member(auth.uid(), v.empresa_id)
  )
);

-- Acesso público (anon + auth) para SELECT via token de candidato (precisa do token na busca)
CREATE POLICY "AdmDoc select publico via candidato"
ON public.admissao_documentos FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vaga_candidatos c
    WHERE c.id = admissao_documentos.candidato_id
      AND c.doc_token IS NOT NULL
  )
);

-- INSERT público — permitido se o candidato existir e estiver em admissao
CREATE POLICY "AdmDoc insert publico"
ON public.admissao_documentos FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vaga_candidatos c
    WHERE c.id = admissao_documentos.candidato_id
      AND c.etapa = 'admissao'
  )
);

-- DELETE empresa
CREATE POLICY "AdmDoc delete por empresa"
ON public.admissao_documentos FOR DELETE
TO authenticated
USING (
  is_admin_mestre(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.vaga_candidatos c
    JOIN public.admissoes_movimentacao v ON v.id = c.vaga_id
    WHERE c.id = admissao_documentos.candidato_id
      AND can_edit_empresa(auth.uid(), v.empresa_id)
  )
);

-- 3) Bucket de storage
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos-admissao', 'documentos-admissao', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (usar bucket público para visualização simplificada)
CREATE POLICY "DocAdm storage select publico"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'documentos-admissao');

CREATE POLICY "DocAdm storage insert publico"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'documentos-admissao');

CREATE POLICY "DocAdm storage delete autenticado"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documentos-admissao');
