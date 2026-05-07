
-- Tabela de terceiros (prestadores) por empresa
CREATE TABLE public.terceiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  nome text NOT NULL,
  documento text,
  telefone text,
  email text,
  funcao text,
  chave_pix text,
  tipo_pix text,
  banco text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_terceiros_empresa ON public.terceiros(empresa_id);

ALTER TABLE public.terceiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Terc select por empresa" ON public.terceiros FOR SELECT TO authenticated
  USING (is_admin_mestre(auth.uid()) OR is_empresa_member(auth.uid(), empresa_id));
CREATE POLICY "Terc insert por empresa" ON public.terceiros FOR INSERT TO authenticated
  WITH CHECK (can_edit_empresa(auth.uid(), empresa_id));
CREATE POLICY "Terc update por empresa" ON public.terceiros FOR UPDATE TO authenticated
  USING (can_edit_empresa(auth.uid(), empresa_id));
CREATE POLICY "Terc delete por empresa" ON public.terceiros FOR DELETE TO authenticated
  USING (can_manage_empresa(auth.uid(), empresa_id));

CREATE TRIGGER trg_terceiros_updated BEFORE UPDATE ON public.terceiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Chamadas (pagamentos/registros) para terceiros
CREATE TABLE public.terceiros_chamadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  terceiro_id uuid NOT NULL REFERENCES public.terceiros(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  descricao text,
  valor numeric(12,2),
  chave_pix text,
  tipo_pix text,
  banco_destino text,
  titular_destino text,
  data_deposito date,
  status text NOT NULL DEFAULT 'pendente',
  observacao text,
  comprovante_url text,
  created_by uuid,
  created_by_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tchamadas_empresa ON public.terceiros_chamadas(empresa_id);
CREATE INDEX idx_tchamadas_terceiro ON public.terceiros_chamadas(terceiro_id);
CREATE INDEX idx_tchamadas_data ON public.terceiros_chamadas(data);

ALTER TABLE public.terceiros_chamadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TercCh select por empresa" ON public.terceiros_chamadas FOR SELECT TO authenticated
  USING (is_admin_mestre(auth.uid()) OR is_empresa_member(auth.uid(), empresa_id));
CREATE POLICY "TercCh insert por empresa" ON public.terceiros_chamadas FOR INSERT TO authenticated
  WITH CHECK (can_edit_empresa(auth.uid(), empresa_id));
CREATE POLICY "TercCh update por empresa" ON public.terceiros_chamadas FOR UPDATE TO authenticated
  USING (can_edit_empresa(auth.uid(), empresa_id));
CREATE POLICY "TercCh delete por empresa" ON public.terceiros_chamadas FOR DELETE TO authenticated
  USING (can_manage_empresa(auth.uid(), empresa_id));

CREATE TRIGGER trg_tchamadas_updated BEFORE UPDATE ON public.terceiros_chamadas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
