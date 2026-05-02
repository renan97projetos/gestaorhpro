
CREATE TABLE public.admissoes_movimentacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL,
  colaborador_nome text NOT NULL,
  cargo text,
  setor text,
  tipo text NOT NULL DEFAULT 'substituicao', -- 'substituicao' | 'aumento_quadro'
  substituido_id uuid,
  substituido_nome text,
  vaga_id text,
  data_admissao date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  created_by uuid,
  created_by_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admissoes_movimentacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Adm mov select autenticado" ON public.admissoes_movimentacao
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Adm mov insert admin gestor" ON public.admissoes_movimentacao
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Adm mov update admin gestor" ON public.admissoes_movimentacao
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Adm mov delete admin" ON public.admissoes_movimentacao
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER tg_adm_mov_updated_at
  BEFORE UPDATE ON public.admissoes_movimentacao
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_adm_mov_data ON public.admissoes_movimentacao(data_admissao DESC);
CREATE INDEX idx_adm_mov_colab ON public.admissoes_movimentacao(colaborador_id);
