
CREATE TABLE public.chamados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text NOT NULL,
  categoria text NOT NULL DEFAULT 'melhoria',
  prioridade text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'aberto',
  resposta text,
  motivo text,
  created_by uuid,
  created_by_nome text,
  respondido_por uuid,
  respondido_por_nome text,
  respondido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cham select por empresa" ON public.chamados FOR SELECT TO authenticated
USING (is_admin_mestre(auth.uid()) OR is_empresa_member(auth.uid(), empresa_id));
CREATE POLICY "Cham insert por empresa" ON public.chamados FOR INSERT TO authenticated
WITH CHECK (is_empresa_member(auth.uid(), empresa_id) AND auth.uid() = created_by);
CREATE POLICY "Cham update mestre ou autor" ON public.chamados FOR UPDATE TO authenticated
USING (is_admin_mestre(auth.uid()) OR auth.uid() = created_by);
CREATE POLICY "Cham delete mestre" ON public.chamados FOR DELETE TO authenticated
USING (is_admin_mestre(auth.uid()));

CREATE TRIGGER tg_chamados_updated_at BEFORE UPDATE ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.chamados_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_nome text,
  is_mestre boolean NOT NULL DEFAULT false,
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chamados_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ChamMsg select" ON public.chamados_mensagens FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.chamados c WHERE c.id = chamado_id
  AND (is_admin_mestre(auth.uid()) OR is_empresa_member(auth.uid(), c.empresa_id))));
CREATE POLICY "ChamMsg insert" ON public.chamados_mensagens FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.chamados c WHERE c.id = chamado_id
  AND (is_admin_mestre(auth.uid()) OR is_empresa_member(auth.uid(), c.empresa_id))));

CREATE INDEX idx_chamados_empresa ON public.chamados(empresa_id, created_at DESC);
CREATE INDEX idx_chamados_status ON public.chamados(status);
