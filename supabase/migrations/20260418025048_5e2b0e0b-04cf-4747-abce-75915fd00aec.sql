-- Auto-promove e-mails específicos a admin no signup
CREATE OR REPLACE FUNCTION public.auto_promote_initial_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IN ('lucaspsirh@gmail.com', 'lucascourorhpsi@gmail.com') THEN
    -- Remove role padrão de "usuario" e insere "admin"
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Roda DEPOIS do handle_new_user (que insere papel padrão)
DROP TRIGGER IF EXISTS on_profile_created_promote_admin ON public.profiles;
CREATE TRIGGER on_profile_created_promote_admin
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_promote_initial_admins();

-- Caso já exista perfil para esses e-mails (cadastro feito antes), promove agora
DO $$
DECLARE u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.profiles WHERE email IN ('lucaspsirh@gmail.com','lucascourorhpsi@gmail.com')
  LOOP
    DELETE FROM public.user_roles WHERE user_id = u.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (u.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;