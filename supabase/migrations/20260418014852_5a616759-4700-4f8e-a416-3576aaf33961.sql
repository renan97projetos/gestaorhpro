-- Fix search_path
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

-- Restringir insert de movimentacoes
drop policy if exists "Mov insert autenticado" on public.movimentacoes;
create policy "Mov insert proprio user" on public.movimentacoes
  for insert to authenticated with check (auth.uid() = user_id);
