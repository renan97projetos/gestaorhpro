
-- ================== ADMISSOES HISTORICO ==================
CREATE TABLE public.admissoes_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movimentacao_id uuid,
  evento text NOT NULL, -- 'criada' | 'editada' | 'finalizada' | 'excluida'
  detalhes jsonb,
  user_id uuid,
  user_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admissoes_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AdmHist select autenticado" ON public.admissoes_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "AdmHist insert autenticado" ON public.admissoes_historico FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "AdmHist delete admin" ON public.admissoes_historico FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE INDEX idx_admhist_created ON public.admissoes_historico(created_at DESC);

-- ================== NOTAS (privadas) ==================
CREATE TABLE public.notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL DEFAULT 'Sem título',
  conteudo text,
  cor text,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notas select dono ou admin" ON public.notas FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "Notas insert dono" ON public.notas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Notas update dono" ON public.notas FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Notas delete dono" ON public.notas FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER tg_notas_updated BEFORE UPDATE ON public.notas FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ================== AUDIT LOG (admin) ==================
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_nome text,
  user_email text,
  acao text NOT NULL, -- 'create' | 'update' | 'delete'
  entidade text NOT NULL, -- nome da tabela/feature
  entidade_id text,
  resumo text,
  detalhes jsonb,
  rota text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit select admin" ON public.audit_log FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Audit insert autenticado" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_user ON public.audit_log(user_id);

-- ================== FEEDBACKS ==================
CREATE TABLE public.feedback_campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'aberta', -- aberta | fechada
  created_by uuid,
  created_by_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback_campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fb camp select autenticado" ON public.feedback_campanhas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fb camp insert admin gestor" ON public.feedback_campanhas FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Fb camp update admin gestor" ON public.feedback_campanhas FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Fb camp delete admin" ON public.feedback_campanhas FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE TRIGGER tg_fb_camp_updated BEFORE UPDATE ON public.feedback_campanhas FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.feedback_perguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL REFERENCES public.feedback_campanhas(id) ON DELETE CASCADE,
  texto text NOT NULL,
  tipo text NOT NULL DEFAULT 'nota_0_10', -- nota_0_10 | texto | sim_nao
  ordem int NOT NULL DEFAULT 0,
  obrigatoria boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback_perguntas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fb perg select autenticado" ON public.feedback_perguntas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fb perg insert admin gestor" ON public.feedback_perguntas FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Fb perg update admin gestor" ON public.feedback_perguntas FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
CREATE POLICY "Fb perg delete admin gestor" ON public.feedback_perguntas FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE TABLE public.feedback_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL REFERENCES public.feedback_campanhas(id) ON DELETE CASCADE,
  user_id uuid,
  user_nome text,
  setor text,
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback_respostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fb resp insert autenticado" ON public.feedback_respostas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Fb resp select admin gestor" ON public.feedback_respostas FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));

CREATE TABLE public.feedback_resposta_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resposta_id uuid NOT NULL REFERENCES public.feedback_respostas(id) ON DELETE CASCADE,
  pergunta_id uuid NOT NULL REFERENCES public.feedback_perguntas(id) ON DELETE CASCADE,
  valor_nota smallint,
  valor_texto text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback_resposta_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fb item insert autenticado" ON public.feedback_resposta_itens FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Fb item select admin gestor" ON public.feedback_resposta_itens FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'gestor'));
