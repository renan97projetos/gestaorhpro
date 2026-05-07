
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_id uuid;
BEGIN
  SELECT id INTO old_id FROM public.profiles WHERE email = NEW.email AND id <> NEW.id LIMIT 1;
  IF old_id IS NOT NULL THEN
    UPDATE public.empresa_membros SET user_id = NEW.id
      WHERE user_id = old_id
      AND NOT EXISTS (SELECT 1 FROM public.empresa_membros em2 WHERE em2.user_id = NEW.id AND em2.empresa_id = empresa_membros.empresa_id);
    DELETE FROM public.empresa_membros WHERE user_id = old_id;

    UPDATE public.admin_mestres SET user_id = NEW.id
      WHERE user_id = old_id
      AND NOT EXISTS (SELECT 1 FROM public.admin_mestres am2 WHERE am2.user_id = NEW.id);
    DELETE FROM public.admin_mestres WHERE user_id = old_id;

    UPDATE public.user_roles SET user_id = NEW.id
      WHERE user_id = old_id
      AND NOT EXISTS (SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = NEW.id AND ur2.role = user_roles.role);
    DELETE FROM public.user_roles WHERE user_id = old_id;

    UPDATE public.notas SET user_id = NEW.id WHERE user_id = old_id;

    DELETE FROM public.profiles WHERE id = old_id;
  END IF;

  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, nome = COALESCE(EXCLUDED.nome, public.profiles.nome);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'usuario')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_promote ON auth.users;
CREATE TRIGGER on_auth_user_created_promote
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_promote_initial_admins();

CREATE OR REPLACE FUNCTION public.auto_link_mestres_to_empresa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.empresa_membros (empresa_id, user_id, role)
  SELECT NEW.id, am.user_id, 'admin'::public.empresa_role
  FROM public.admin_mestres am
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_empresa_created ON public.empresas;
CREATE TRIGGER on_empresa_created
  AFTER INSERT ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_mestres_to_empresa();

CREATE UNIQUE INDEX IF NOT EXISTS empresa_membros_unique ON public.empresa_membros(empresa_id, user_id);

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_promote_initial_admins() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_link_mestres_to_empresa() TO anon, authenticated, service_role;
