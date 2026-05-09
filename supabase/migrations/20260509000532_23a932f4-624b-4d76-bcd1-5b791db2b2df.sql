
-- Restore EXECUTE for helper functions called from RLS policies.
-- Without this, RLS evaluation fails for authenticated users.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_empresa_role(uuid, uuid, empresa_role) TO authenticated;
-- These three are also needed by anon for policies that allow anonymous access (pesquisas/perguntas leitura publica)
GRANT EXECUTE ON FUNCTION public.is_admin_mestre(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_empresa_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_empresa(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_empresa(uuid, uuid) TO anon, authenticated;
