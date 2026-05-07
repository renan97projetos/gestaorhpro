
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_mestre(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_empresa_member(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_empresa_role(uuid, uuid, public.empresa_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_empresa(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_empresa(uuid, uuid) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.auto_promote_initial_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IN (
    'lucaspsirh@gmail.com',
    'lucascourorhpsi@gmail.com',
    'lucascoutopsirh@gmail.com',
    'lucascoutorhpsi@gmail.com'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF NEW.email = 'lucascoutorhpsi@gmail.com' THEN
    INSERT INTO public.admin_mestres (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  IF NEW.email = 'lucaspsirh@gmail.com' THEN
    INSERT INTO public.empresa_membros (empresa_id, user_id, role)
    SELECT id, NEW.id, 'gestor'::public.empresa_role FROM public.empresas WHERE slug = 'grupo-real'
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
