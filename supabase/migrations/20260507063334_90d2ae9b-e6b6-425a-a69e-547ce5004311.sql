DROP POLICY IF EXISTS "Empresas update mestre admin" ON public.empresas;
CREATE POLICY "Empresas update gestores" ON public.empresas
FOR UPDATE USING (public.can_edit_empresa(auth.uid(), id));