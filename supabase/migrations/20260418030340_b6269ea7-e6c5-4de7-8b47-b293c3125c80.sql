-- Adiciona o e-mail correto à lista de admins automáticos
CREATE OR REPLACE FUNCTION public.auto_promote_initial_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IN (
    'lucaspsirh@gmail.com',
    'lucascourorhpsi@gmail.com',
    'lucascoutopsirh@gmail.com'
  ) THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Promove imediatamente o usuário existente
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM public.profiles
  WHERE email IN (
    'lucaspsirh@gmail.com',
    'lucascourorhpsi@gmail.com',
    'lucascoutopsirh@gmail.com'
  )
);

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE email IN (
  'lucaspsirh@gmail.com',
  'lucascourorhpsi@gmail.com',
  'lucascoutopsirh@gmail.com'
)
ON CONFLICT (user_id, role) DO NOTHING;