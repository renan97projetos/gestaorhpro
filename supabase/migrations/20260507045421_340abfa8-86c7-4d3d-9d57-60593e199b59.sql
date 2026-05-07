DROP POLICY IF EXISTS "Empresa assets upload por gestor" ON storage.objects;
DROP POLICY IF EXISTS "Empresa assets update por manager" ON storage.objects;
DROP POLICY IF EXISTS "Empresa assets delete por manager" ON storage.objects;

CREATE POLICY "Empresa assets upload por gestor"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'empresa-assets' AND (
  is_admin_mestre(auth.uid())
  OR can_edit_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
));

CREATE POLICY "Empresa assets update por gestor"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'empresa-assets' AND (
  is_admin_mestre(auth.uid())
  OR can_edit_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
));

CREATE POLICY "Empresa assets delete por gestor"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'empresa-assets' AND (
  is_admin_mestre(auth.uid())
  OR can_edit_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
));