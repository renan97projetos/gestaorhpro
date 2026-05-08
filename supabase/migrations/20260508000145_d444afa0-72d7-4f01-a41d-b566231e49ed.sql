
CREATE TABLE public.crm_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_nome text NOT NULL,
  cnpj text,
  site text,
  segmento text,
  porte text,
  responsavel_nome text,
  responsavel_cargo text,
  telefone text,
  email text,
  origem text,
  status text NOT NULL DEFAULT 'novo',
  proximo_contato date,
  ultimo_contato date,
  valor_estimado numeric DEFAULT 0,
  observacoes text,
  owner_id uuid,
  owner_nome text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM leads select mestre" ON public.crm_leads
FOR SELECT TO authenticated USING (public.is_admin_mestre(auth.uid()));

CREATE POLICY "CRM leads insert mestre" ON public.crm_leads
FOR INSERT TO authenticated WITH CHECK (public.is_admin_mestre(auth.uid()));

CREATE POLICY "CRM leads update mestre" ON public.crm_leads
FOR UPDATE TO authenticated USING (public.is_admin_mestre(auth.uid()));

CREATE POLICY "CRM leads delete mestre" ON public.crm_leads
FOR DELETE TO authenticated USING (public.is_admin_mestre(auth.uid()));

CREATE TRIGGER crm_leads_set_updated_at
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.crm_interacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  data_contato timestamptz NOT NULL DEFAULT now(),
  canal text NOT NULL DEFAULT 'ligacao',
  com_quem text,
  resumo text NOT NULL,
  proximo_passo text,
  user_id uuid NOT NULL,
  user_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_interacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CRM inter select mestre" ON public.crm_interacoes
FOR SELECT TO authenticated USING (public.is_admin_mestre(auth.uid()));

CREATE POLICY "CRM inter insert mestre" ON public.crm_interacoes
FOR INSERT TO authenticated WITH CHECK (public.is_admin_mestre(auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "CRM inter update mestre" ON public.crm_interacoes
FOR UPDATE TO authenticated USING (public.is_admin_mestre(auth.uid()));

CREATE POLICY "CRM inter delete mestre" ON public.crm_interacoes
FOR DELETE TO authenticated USING (public.is_admin_mestre(auth.uid()));

CREATE INDEX crm_leads_status_idx ON public.crm_leads(status);
CREATE INDEX crm_interacoes_lead_idx ON public.crm_interacoes(lead_id, data_contato DESC);
