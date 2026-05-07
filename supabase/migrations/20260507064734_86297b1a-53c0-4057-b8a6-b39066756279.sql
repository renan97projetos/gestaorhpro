
-- =========================
-- Tabela principal: denúncias
-- =========================
CREATE TABLE public.etica_denuncias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  categoria text NOT NULL DEFAULT 'conduta',
  titulo text NOT NULL,
  descricao text NOT NULL,
  prioridade text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'recebida',
  anonimo boolean NOT NULL DEFAULT false,
  denunciante_user_id uuid,
  denunciante_nome text,
  denunciante_email text,
  responsavel_id uuid,
  responsavel_nome text,
  conclusao text,
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_etica_denuncias_empresa ON public.etica_denuncias(empresa_id);
CREATE INDEX idx_etica_denuncias_status ON public.etica_denuncias(status);

ALTER TABLE public.etica_denuncias ENABLE ROW LEVEL SECURITY;

-- INSERT: qualquer membro da empresa pode denunciar.
-- Se anônimo, denunciante_user_id deve ser NULL; caso contrário, deve = auth.uid()
CREATE POLICY "Etica denuncias insert membro" ON public.etica_denuncias
FOR INSERT TO authenticated WITH CHECK (
  public.is_empresa_member(auth.uid(), empresa_id)
  AND (
    (anonimo = true AND denunciante_user_id IS NULL)
    OR (anonimo = false AND denunciante_user_id = auth.uid())
  )
);

-- SELECT: mestre ou gestor da empresa veem tudo; denunciante (não anônimo) vê o que enviou
CREATE POLICY "Etica denuncias select" ON public.etica_denuncias
FOR SELECT TO authenticated USING (
  public.is_admin_mestre(auth.uid())
  OR public.can_edit_empresa(auth.uid(), empresa_id)
  OR (anonimo = false AND denunciante_user_id = auth.uid())
);

-- UPDATE: apenas gestores/admins da empresa ou mestre
CREATE POLICY "Etica denuncias update gestor" ON public.etica_denuncias
FOR UPDATE TO authenticated USING (
  public.is_admin_mestre(auth.uid()) OR public.can_edit_empresa(auth.uid(), empresa_id)
);

-- DELETE: apenas mestre ou admin da empresa
CREATE POLICY "Etica denuncias delete admin" ON public.etica_denuncias
FOR DELETE TO authenticated USING (
  public.is_admin_mestre(auth.uid()) OR public.can_manage_empresa(auth.uid(), empresa_id)
);

CREATE TRIGGER etica_denuncias_set_updated_at
  BEFORE UPDATE ON public.etica_denuncias
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- Tratativas (mensagens internas + mudanças de status)
-- =========================
CREATE TABLE public.etica_tratativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  denuncia_id uuid NOT NULL REFERENCES public.etica_denuncias(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_nome text,
  mensagem text NOT NULL,
  status_novo text,
  interno boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_etica_tratativas_denuncia ON public.etica_tratativas(denuncia_id);

ALTER TABLE public.etica_tratativas ENABLE ROW LEVEL SECURITY;

-- INSERT: gestor da empresa do denuncia ou mestre
CREATE POLICY "Etica trat insert gestor" ON public.etica_tratativas
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.etica_denuncias d
    WHERE d.id = etica_tratativas.denuncia_id
      AND (public.is_admin_mestre(auth.uid()) OR public.can_edit_empresa(auth.uid(), d.empresa_id))
  )
);

-- SELECT: gestor/mestre vêem tudo; denunciante não anônimo vê apenas tratativas NÃO internas das próprias denúncias
CREATE POLICY "Etica trat select" ON public.etica_tratativas
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.etica_denuncias d
    WHERE d.id = etica_tratativas.denuncia_id
      AND (
        public.is_admin_mestre(auth.uid())
        OR public.can_edit_empresa(auth.uid(), d.empresa_id)
        OR (interno = false AND d.anonimo = false AND d.denunciante_user_id = auth.uid())
      )
  )
);
