
-- 1. Add empresa_id columns
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.ideias ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE public.pesquisas ADD COLUMN IF NOT EXISTS empresa_id uuid;

-- Backfill via colaboradores where possible
UPDATE public.solicitacoes s SET empresa_id = c.empresa_id
  FROM public.colaboradores c WHERE s.colaborador_id = c.id AND s.empresa_id IS NULL;

-- Default everything else to grupo-real
UPDATE public.solicitacoes SET empresa_id = '789451d8-dcc1-425e-ac5e-3396d7175381' WHERE empresa_id IS NULL;
UPDATE public.ideias SET empresa_id = '789451d8-dcc1-425e-ac5e-3396d7175381' WHERE empresa_id IS NULL;
UPDATE public.pesquisas SET empresa_id = '789451d8-dcc1-425e-ac5e-3396d7175381' WHERE empresa_id IS NULL;

ALTER TABLE public.solicitacoes ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.ideias ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.pesquisas ALTER COLUMN empresa_id SET NOT NULL;

-- 2. solicitacoes policies
DROP POLICY IF EXISTS "Sol select escopado" ON public.solicitacoes;
DROP POLICY IF EXISTS "Sol insert autenticado" ON public.solicitacoes;
DROP POLICY IF EXISTS "Sol update admin gestor" ON public.solicitacoes;

CREATE POLICY "Sol select por empresa" ON public.solicitacoes FOR SELECT TO authenticated
USING (
  is_admin_mestre(auth.uid())
  OR auth.uid() = solicitante_id
  OR auth.uid() = aprovador_id
  OR is_empresa_member(auth.uid(), empresa_id)
);

CREATE POLICY "Sol insert por empresa" ON public.solicitacoes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = solicitante_id AND is_empresa_member(auth.uid(), empresa_id));

CREATE POLICY "Sol update por empresa" ON public.solicitacoes FOR UPDATE TO authenticated
USING (can_edit_empresa(auth.uid(), empresa_id));

-- 3. ideias policies
DROP POLICY IF EXISTS "Ideias select admin gestor todas" ON public.ideias;
DROP POLICY IF EXISTS "Ideias insert autenticado" ON public.ideias;
DROP POLICY IF EXISTS "Ideias update admin gestor" ON public.ideias;
DROP POLICY IF EXISTS "Ideias delete admin gestor" ON public.ideias;

CREATE POLICY "Ideias select por empresa" ON public.ideias FOR SELECT TO authenticated
USING (
  is_admin_mestre(auth.uid())
  OR auth.uid() = user_id
  OR can_edit_empresa(auth.uid(), empresa_id)
);

CREATE POLICY "Ideias insert por empresa" ON public.ideias FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND is_empresa_member(auth.uid(), empresa_id));

CREATE POLICY "Ideias update por empresa" ON public.ideias FOR UPDATE TO authenticated
USING (can_edit_empresa(auth.uid(), empresa_id));

CREATE POLICY "Ideias delete por empresa" ON public.ideias FOR DELETE TO authenticated
USING (can_manage_empresa(auth.uid(), empresa_id));

-- 4. pesquisas policies
DROP POLICY IF EXISTS "Pesquisas leitura publica abertas" ON public.pesquisas;
DROP POLICY IF EXISTS "Pesquisas insert admin gestor" ON public.pesquisas;
DROP POLICY IF EXISTS "Pesquisas update admin gestor" ON public.pesquisas;
DROP POLICY IF EXISTS "Pesquisas delete admin" ON public.pesquisas;

-- Public can still read open pesquisas (needed for /p/$token public response form)
CREATE POLICY "Pesquisas leitura publica abertas" ON public.pesquisas FOR SELECT TO anon, authenticated
USING (status = 'aberta' OR is_admin_mestre(auth.uid()) OR is_empresa_member(auth.uid(), empresa_id));

CREATE POLICY "Pesquisas insert por empresa" ON public.pesquisas FOR INSERT TO authenticated
WITH CHECK (can_edit_empresa(auth.uid(), empresa_id));

CREATE POLICY "Pesquisas update por empresa" ON public.pesquisas FOR UPDATE TO authenticated
USING (can_edit_empresa(auth.uid(), empresa_id));

CREATE POLICY "Pesquisas delete por empresa" ON public.pesquisas FOR DELETE TO authenticated
USING (can_manage_empresa(auth.uid(), empresa_id));

-- 5. respostas_pesquisa - scope reads to empresa via pesquisa
DROP POLICY IF EXISTS "Respostas select admin gestor" ON public.respostas_pesquisa;
CREATE POLICY "Respostas select por empresa" ON public.respostas_pesquisa FOR SELECT TO authenticated
USING (
  is_admin_mestre(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.pesquisas p
    WHERE p.id = respostas_pesquisa.pesquisa_id
      AND can_edit_empresa(auth.uid(), p.empresa_id)
  )
);

-- 6. respostas_item
DROP POLICY IF EXISTS "Resp item select admin gestor" ON public.respostas_item;
CREATE POLICY "Resp item select por empresa" ON public.respostas_item FOR SELECT TO authenticated
USING (
  is_admin_mestre(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.respostas_pesquisa r
    JOIN public.pesquisas p ON p.id = r.pesquisa_id
    WHERE r.id = respostas_item.resposta_id
      AND can_edit_empresa(auth.uid(), p.empresa_id)
  )
);

-- 7. feedback_respostas
DROP POLICY IF EXISTS "Fb resp select admin gestor" ON public.feedback_respostas;
CREATE POLICY "Fb resp select por empresa" ON public.feedback_respostas FOR SELECT TO authenticated
USING (
  is_admin_mestre(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.feedback_campanhas c
    WHERE c.id = feedback_respostas.campanha_id
      AND can_edit_empresa(auth.uid(), c.empresa_id)
  )
);

-- 8. feedback_resposta_itens
DROP POLICY IF EXISTS "Fb item select admin gestor" ON public.feedback_resposta_itens;
CREATE POLICY "Fb item select por empresa" ON public.feedback_resposta_itens FOR SELECT TO authenticated
USING (
  is_admin_mestre(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.feedback_respostas r
    JOIN public.feedback_campanhas c ON c.id = r.campanha_id
    WHERE r.id = feedback_resposta_itens.resposta_id
      AND can_edit_empresa(auth.uid(), c.empresa_id)
  )
);

-- 9. notas - remove global admin bypass
DROP POLICY IF EXISTS "Notas select dono ou admin" ON public.notas;
CREATE POLICY "Notas select dono" ON public.notas FOR SELECT TO authenticated
USING (auth.uid() = user_id OR is_admin_mestre(auth.uid()));

-- 10. audit_log - require user_email matches auth jwt email
DROP POLICY IF EXISTS "Audit insert autenticado" ON public.audit_log;
CREATE POLICY "Audit insert proprio" ON public.audit_log FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (user_email IS NULL OR user_email = (auth.jwt() ->> 'email'))
);
