
-- Admin mestres
CREATE TABLE public.admin_mestres (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_mestres ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin_mestre(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_mestres WHERE user_id = _uid) $$;

CREATE POLICY "AdminMestre select self or mestre" ON public.admin_mestres
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin_mestre(auth.uid()));
CREATE POLICY "AdminMestre insert mestre" ON public.admin_mestres
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_mestre(auth.uid()));
CREATE POLICY "AdminMestre delete mestre" ON public.admin_mestres
  FOR DELETE TO authenticated USING (public.is_admin_mestre(auth.uid()));

-- Empresas
CREATE TYPE public.empresa_role AS ENUM ('admin','gestor','visualizador');

CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  logo_url text, capa_url text, sobre text,
  endereco text, telefone text, cnpj text, email_contato text,
  cor_primaria text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_empresas_updated_at BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.empresa_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.empresa_role NOT NULL DEFAULT 'visualizador',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, user_id)
);
ALTER TABLE public.empresa_membros ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_empresa_member(_uid uuid, _empresa uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.empresa_membros WHERE user_id = _uid AND empresa_id = _empresa) $$;

CREATE OR REPLACE FUNCTION public.has_empresa_role(_uid uuid, _empresa uuid, _role public.empresa_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.empresa_membros WHERE user_id = _uid AND empresa_id = _empresa AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.can_manage_empresa(_uid uuid, _empresa uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_admin_mestre(_uid) OR public.has_empresa_role(_uid, _empresa, 'admin'::public.empresa_role) $$;

CREATE OR REPLACE FUNCTION public.can_edit_empresa(_uid uuid, _empresa uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_admin_mestre(_uid)
      OR public.has_empresa_role(_uid, _empresa, 'admin'::public.empresa_role)
      OR public.has_empresa_role(_uid, _empresa, 'gestor'::public.empresa_role) $$;

CREATE POLICY "Empresas select membros mestre" ON public.empresas
  FOR SELECT TO authenticated
  USING (public.is_admin_mestre(auth.uid()) OR public.is_empresa_member(auth.uid(), id));
CREATE POLICY "Empresas insert mestre" ON public.empresas
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_mestre(auth.uid()));
CREATE POLICY "Empresas update mestre admin" ON public.empresas
  FOR UPDATE TO authenticated USING (public.can_manage_empresa(auth.uid(), id));
CREATE POLICY "Empresas delete mestre" ON public.empresas
  FOR DELETE TO authenticated USING (public.is_admin_mestre(auth.uid()));
CREATE POLICY "Empresas select publica ativa" ON public.empresas
  FOR SELECT TO anon USING (ativo = true);

CREATE POLICY "Membros select mestre admin self" ON public.empresa_membros
  FOR SELECT TO authenticated
  USING (public.is_admin_mestre(auth.uid()) OR public.can_manage_empresa(auth.uid(), empresa_id) OR auth.uid() = user_id);
CREATE POLICY "Membros insert mestre admin" ON public.empresa_membros
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_empresa(auth.uid(), empresa_id));
CREATE POLICY "Membros update mestre admin" ON public.empresa_membros
  FOR UPDATE TO authenticated USING (public.can_manage_empresa(auth.uid(), empresa_id));
CREATE POLICY "Membros delete mestre admin" ON public.empresa_membros
  FOR DELETE TO authenticated USING (public.can_manage_empresa(auth.uid(), empresa_id));

ALTER TABLE public.colaboradores ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.admissoes_movimentacao ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.admissoes_movimentacao ADD COLUMN publicada boolean NOT NULL DEFAULT false;
ALTER TABLE public.admissoes_movimentacao ADD COLUMN descricao text;
ALTER TABLE public.vaga_candidatos ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;

INSERT INTO public.empresas (slug, nome, sobre, ativo)
VALUES ('grupo-real', 'Grupo Real', 'Bem-vindo ao Grupo Real.', true);

UPDATE public.colaboradores SET empresa_id = (SELECT id FROM public.empresas WHERE slug='grupo-real') WHERE empresa_id IS NULL;
UPDATE public.admissoes_movimentacao SET empresa_id = (SELECT id FROM public.empresas WHERE slug='grupo-real') WHERE empresa_id IS NULL;
UPDATE public.vaga_candidatos SET empresa_id = (SELECT id FROM public.empresas WHERE slug='grupo-real') WHERE empresa_id IS NULL;

ALTER TABLE public.colaboradores ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.admissoes_movimentacao ALTER COLUMN empresa_id SET NOT NULL;

-- Vincular usuários (deduplicado: 1 papel por user, prioridade admin>gestor>visualizador)
INSERT INTO public.empresa_membros (empresa_id, user_id, role)
SELECT
  (SELECT id FROM public.empresas WHERE slug='grupo-real'),
  user_id,
  (CASE
     WHEN bool_or(role::text = 'admin') THEN 'admin'
     WHEN bool_or(role::text = 'gestor') THEN 'gestor'
     ELSE 'visualizador'
   END)::public.empresa_role
FROM public.user_roles
GROUP BY user_id;

INSERT INTO public.admin_mestres (user_id)
SELECT id FROM auth.users WHERE email = 'lucaspsirh@gmail.com'
ON CONFLICT DO NOTHING;

-- Atualizar RLS
DROP POLICY IF EXISTS "Colab select autenticado" ON public.colaboradores;
DROP POLICY IF EXISTS "Colab insert admin gestor" ON public.colaboradores;
DROP POLICY IF EXISTS "Colab update admin gestor" ON public.colaboradores;
DROP POLICY IF EXISTS "Colab delete admin" ON public.colaboradores;

CREATE POLICY "Colab select por empresa" ON public.colaboradores FOR SELECT TO authenticated
  USING (public.is_admin_mestre(auth.uid()) OR public.is_empresa_member(auth.uid(), empresa_id));
CREATE POLICY "Colab insert por empresa" ON public.colaboradores FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_empresa(auth.uid(), empresa_id));
CREATE POLICY "Colab update por empresa" ON public.colaboradores FOR UPDATE TO authenticated
  USING (public.can_edit_empresa(auth.uid(), empresa_id));
CREATE POLICY "Colab delete por empresa" ON public.colaboradores FOR DELETE TO authenticated
  USING (public.can_manage_empresa(auth.uid(), empresa_id));

DROP POLICY IF EXISTS "Adm mov select autenticado" ON public.admissoes_movimentacao;
DROP POLICY IF EXISTS "Adm mov insert admin gestor" ON public.admissoes_movimentacao;
DROP POLICY IF EXISTS "Adm mov update admin gestor" ON public.admissoes_movimentacao;
DROP POLICY IF EXISTS "Adm mov delete admin" ON public.admissoes_movimentacao;
DROP POLICY IF EXISTS "Vaga select publico por token" ON public.admissoes_movimentacao;

CREATE POLICY "Vagas select por empresa" ON public.admissoes_movimentacao FOR SELECT TO authenticated
  USING (public.is_admin_mestre(auth.uid()) OR public.is_empresa_member(auth.uid(), empresa_id));
CREATE POLICY "Vagas insert por empresa" ON public.admissoes_movimentacao FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_empresa(auth.uid(), empresa_id));
CREATE POLICY "Vagas update por empresa" ON public.admissoes_movimentacao FOR UPDATE TO authenticated
  USING (public.can_edit_empresa(auth.uid(), empresa_id));
CREATE POLICY "Vagas delete por empresa" ON public.admissoes_movimentacao FOR DELETE TO authenticated
  USING (public.can_manage_empresa(auth.uid(), empresa_id));
CREATE POLICY "Vagas select publico token ou publicada" ON public.admissoes_movimentacao FOR SELECT TO anon
  USING (status = 'aberta' AND (publicada = true OR link_token IS NOT NULL));

DROP POLICY IF EXISTS "Cand select autenticado" ON public.vaga_candidatos;
DROP POLICY IF EXISTS "Cand insert publico vaga aberta" ON public.vaga_candidatos;
DROP POLICY IF EXISTS "Cand update admin gestor" ON public.vaga_candidatos;
DROP POLICY IF EXISTS "Cand delete admin gestor" ON public.vaga_candidatos;

CREATE POLICY "Cand select por empresa" ON public.vaga_candidatos FOR SELECT TO authenticated
  USING (public.is_admin_mestre(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.admissoes_movimentacao v
    WHERE v.id = vaga_candidatos.vaga_id AND public.is_empresa_member(auth.uid(), v.empresa_id)));
CREATE POLICY "Cand insert publico vaga aberta" ON public.vaga_candidatos FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admissoes_movimentacao v
    WHERE v.id = vaga_candidatos.vaga_id AND v.status = 'aberta'));
CREATE POLICY "Cand update por empresa" ON public.vaga_candidatos FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admissoes_movimentacao v
    WHERE v.id = vaga_candidatos.vaga_id AND public.can_edit_empresa(auth.uid(), v.empresa_id)));
CREATE POLICY "Cand delete por empresa" ON public.vaga_candidatos FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admissoes_movimentacao v
    WHERE v.id = vaga_candidatos.vaga_id AND public.can_manage_empresa(auth.uid(), v.empresa_id)));

DROP POLICY IF EXISTS "Profiles admin select all" ON public.profiles;
CREATE POLICY "Profiles select admin mestre ou colega" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin_mestre(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.empresa_membros m1
    JOIN public.empresa_membros m2 ON m1.empresa_id = m2.empresa_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id));

CREATE INDEX idx_colab_empresa ON public.colaboradores(empresa_id);
CREATE INDEX idx_vagas_empresa ON public.admissoes_movimentacao(empresa_id);
CREATE INDEX idx_vagas_publicada ON public.admissoes_movimentacao(empresa_id, publicada, status);
CREATE INDEX idx_membros_user ON public.empresa_membros(user_id);

-- Bucket público para logos/capas das empresas
INSERT INTO storage.buckets (id, name, public) VALUES ('empresa-assets', 'empresa-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Empresa assets public read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'empresa-assets');
CREATE POLICY "Empresa assets upload autenticado" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'empresa-assets');
CREATE POLICY "Empresa assets update autenticado" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'empresa-assets');
CREATE POLICY "Empresa assets delete autenticado" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'empresa-assets');
