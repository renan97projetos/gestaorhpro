
-- Tighten movimentacoes INSERT to require empresa membership of referenced colaborador
DROP POLICY IF EXISTS "Mov insert proprio user" ON public.movimentacoes;
CREATE POLICY "Mov insert por empresa"
  ON public.movimentacoes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      is_admin_mestre(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.colaboradores c
        WHERE c.id = movimentacoes.colaborador_id
          AND is_empresa_member(auth.uid(), c.empresa_id)
      )
    )
  );

-- Tighten admissoes_historico INSERT to require empresa membership of referenced movimentacao
DROP POLICY IF EXISTS "AdmHist insert autenticado" ON public.admissoes_historico;
CREATE POLICY "AdmHist insert por empresa"
  ON public.admissoes_historico FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      is_admin_mestre(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.admissoes_movimentacao m
        WHERE m.id = admissoes_historico.movimentacao_id
          AND is_empresa_member(auth.uid(), m.empresa_id)
      )
    )
  );

-- Replace global admin/gestor bypass on pesquisa_perguntas SELECT with empresa-scoped check
DROP POLICY IF EXISTS "Perguntas leitura publica abertas" ON public.pesquisa_perguntas;
CREATE POLICY "Perguntas leitura publica abertas"
  ON public.pesquisa_perguntas FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pesquisas p
      WHERE p.id = pesquisa_perguntas.pesquisa_id
        AND (
          p.status = 'aberta'::pesquisa_status
          OR is_admin_mestre(auth.uid())
          OR is_empresa_member(auth.uid(), p.empresa_id)
        )
    )
  );
