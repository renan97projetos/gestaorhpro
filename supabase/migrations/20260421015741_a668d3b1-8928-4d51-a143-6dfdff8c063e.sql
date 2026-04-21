-- Enum de status de chamada
CREATE TYPE public.chamada_status AS ENUM ('Presente', 'Folga', 'Falta', 'Atestado', 'Ferias', 'Afastado', 'Licenca');

-- Tabela de chamadas (presença diária)
CREATE TABLE public.chamadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  status public.chamada_status NOT NULL,
  observacao TEXT,
  registrado_por UUID,
  registrado_por_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (colaborador_id, data)
);

CREATE INDEX idx_chamadas_data ON public.chamadas(data);
CREATE INDEX idx_chamadas_colab ON public.chamadas(colaborador_id);

ALTER TABLE public.chamadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chamadas select autenticado"
  ON public.chamadas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Chamadas insert autenticado"
  ON public.chamadas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Chamadas update autenticado"
  ON public.chamadas FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Chamadas delete admin"
  ON public.chamadas FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER tg_chamadas_updated_at
  BEFORE UPDATE ON public.chamadas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Tabela de domingos especiais (dias em que domingo conta como dia útil)
CREATE TABLE public.domingos_especiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL UNIQUE,
  descricao TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.domingos_especiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Domingos select autenticado"
  ON public.domingos_especiais FOR SELECT TO authenticated USING (true);

CREATE POLICY "Domingos insert admin gestor"
  ON public.domingos_especiais FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Domingos delete admin gestor"
  ON public.domingos_especiais FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));