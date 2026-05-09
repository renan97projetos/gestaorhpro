-- Tabelas
CREATE TABLE public.desligamento_modelos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.desligamento_perguntas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo_id uuid NOT NULL REFERENCES public.desligamento_modelos(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'texto',
  texto text NOT NULL,
  opcoes jsonb,
  obrigatoria boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.desligamento_entrevistas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  colaborador_id uuid NOT NULL,
  modelo_id uuid REFERENCES public.desligamento_modelos(id) ON DELETE SET NULL,
  modo text NOT NULL DEFAULT 'rh',
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(10), 'hex') UNIQUE,
  status text NOT NULL DEFAULT 'pendente',
  observacao text,
  respondida_em timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.desligamento_respostas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entrevista_id uuid NOT NULL REFERENCES public.desligamento_entrevistas(id) ON DELETE CASCADE,
  pergunta_id uuid NOT NULL REFERENCES public.desligamento_perguntas(id) ON DELETE CASCADE,
  valor_texto text,
  valor_nota smallint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_desl_ent_empresa ON public.desligamento_entrevistas(empresa_id);
CREATE INDEX idx_desl_ent_colab ON public.desligamento_entrevistas(colaborador_id);
CREATE INDEX idx_desl_perg_modelo ON public.desligamento_perguntas(modelo_id);
CREATE INDEX idx_desl_resp_ent ON public.desligamento_respostas(entrevista_id);

CREATE TRIGGER trg_desl_mod_updated BEFORE UPDATE ON public.desligamento_modelos
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_desl_ent_updated BEFORE UPDATE ON public.desligamento_entrevistas
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RLS
ALTER TABLE public.desligamento_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desligamento_perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desligamento_entrevistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desligamento_respostas ENABLE ROW LEVEL SECURITY;

-- Modelos
CREATE POLICY "DeslMod select" ON public.desligamento_modelos FOR SELECT TO authenticated
USING (is_admin_mestre(auth.uid()) OR is_empresa_member(auth.uid(), empresa_id));
CREATE POLICY "DeslMod insert" ON public.desligamento_modelos FOR INSERT TO authenticated
WITH CHECK (can_edit_empresa(auth.uid(), empresa_id));
CREATE POLICY "DeslMod update" ON public.desligamento_modelos FOR UPDATE TO authenticated
USING (can_edit_empresa(auth.uid(), empresa_id));
CREATE POLICY "DeslMod delete" ON public.desligamento_modelos FOR DELETE TO authenticated
USING (can_manage_empresa(auth.uid(), empresa_id));

-- Entrevistas
CREATE POLICY "DeslEnt select" ON public.desligamento_entrevistas FOR SELECT TO authenticated
USING (is_admin_mestre(auth.uid()) OR is_empresa_member(auth.uid(), empresa_id));
CREATE POLICY "DeslEnt insert" ON public.desligamento_entrevistas FOR INSERT TO authenticated
WITH CHECK (can_edit_empresa(auth.uid(), empresa_id));
CREATE POLICY "DeslEnt update" ON public.desligamento_entrevistas FOR UPDATE TO authenticated
USING (can_edit_empresa(auth.uid(), empresa_id));
CREATE POLICY "DeslEnt delete" ON public.desligamento_entrevistas FOR DELETE TO authenticated
USING (can_manage_empresa(auth.uid(), empresa_id));
CREATE POLICY "DeslEnt select publico" ON public.desligamento_entrevistas FOR SELECT TO anon
USING (status = 'pendente');
CREATE POLICY "DeslEnt update publico" ON public.desligamento_entrevistas FOR UPDATE TO anon
USING (status = 'pendente') WITH CHECK (status IN ('pendente','respondida'));

-- Perguntas
CREATE POLICY "DeslPerg select" ON public.desligamento_perguntas FOR SELECT TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.desligamento_modelos m
          WHERE m.id = modelo_id AND (is_admin_mestre(auth.uid()) OR is_empresa_member(auth.uid(), m.empresa_id)))
  OR EXISTS (SELECT 1 FROM public.desligamento_entrevistas e
             WHERE e.modelo_id = desligamento_perguntas.modelo_id AND e.status = 'pendente')
);
CREATE POLICY "DeslPerg insert" ON public.desligamento_perguntas FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.desligamento_modelos m WHERE m.id = modelo_id AND can_edit_empresa(auth.uid(), m.empresa_id)));
CREATE POLICY "DeslPerg update" ON public.desligamento_perguntas FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.desligamento_modelos m WHERE m.id = modelo_id AND can_edit_empresa(auth.uid(), m.empresa_id)));
CREATE POLICY "DeslPerg delete" ON public.desligamento_perguntas FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.desligamento_modelos m WHERE m.id = modelo_id AND can_edit_empresa(auth.uid(), m.empresa_id)));

-- Respostas
CREATE POLICY "DeslResp select" ON public.desligamento_respostas FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.desligamento_entrevistas e WHERE e.id = entrevista_id AND (is_admin_mestre(auth.uid()) OR is_empresa_member(auth.uid(), e.empresa_id))));
CREATE POLICY "DeslResp insert rh" ON public.desligamento_respostas FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.desligamento_entrevistas e WHERE e.id = entrevista_id AND can_edit_empresa(auth.uid(), e.empresa_id)));
CREATE POLICY "DeslResp insert publico" ON public.desligamento_respostas FOR INSERT TO anon
WITH CHECK (EXISTS (SELECT 1 FROM public.desligamento_entrevistas e WHERE e.id = entrevista_id AND e.status = 'pendente'));
CREATE POLICY "DeslResp update" ON public.desligamento_respostas FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.desligamento_entrevistas e WHERE e.id = entrevista_id AND can_edit_empresa(auth.uid(), e.empresa_id)));
CREATE POLICY "DeslResp delete" ON public.desligamento_respostas FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.desligamento_entrevistas e WHERE e.id = entrevista_id AND can_edit_empresa(auth.uid(), e.empresa_id)));