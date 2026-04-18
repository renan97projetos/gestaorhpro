-- Roles
create type public.app_role as enum ('admin', 'gestor', 'usuario');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'usuario',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin')
$$;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles own select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Profiles admin select all" on public.profiles for select to authenticated using (public.is_admin(auth.uid()));
create policy "Profiles own update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Profiles own insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), new.email)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'usuario')
  on conflict (user_id, role) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create policy "Roles own select" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "Roles admin select all" on public.user_roles for select to authenticated using (public.is_admin(auth.uid()));
create policy "Roles admin insert" on public.user_roles for insert to authenticated with check (public.is_admin(auth.uid()));
create policy "Roles admin update" on public.user_roles for update to authenticated using (public.is_admin(auth.uid()));
create policy "Roles admin delete" on public.user_roles for delete to authenticated using (public.is_admin(auth.uid()));

-- Colaboradores
create type public.colaborador_status as enum ('Ativo', 'Demitido', 'Afastado', 'Ferias');

create table public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  matricula text unique not null,
  colaborador text not null,
  status public.colaborador_status not null default 'Ativo',
  cargo text,
  setor text,
  subsetor text,
  lideranca text,
  turno text,
  sabado_trabalho text,
  sabado_horario text,
  horario_almoco text,
  horario_cafe text,
  admissao date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index idx_colaboradores_matricula on public.colaboradores(matricula);
create index idx_colaboradores_status on public.colaboradores(status);
create index idx_colaboradores_setor on public.colaboradores(setor);

alter table public.colaboradores enable row level security;

create policy "Colab select autenticado" on public.colaboradores for select to authenticated using (true);
create policy "Colab insert admin gestor" on public.colaboradores for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'gestor'));
create policy "Colab update admin gestor" on public.colaboradores for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'gestor'));
create policy "Colab delete admin" on public.colaboradores for delete to authenticated using (public.is_admin(auth.uid()));

-- Movimentações
create table public.movimentacoes (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  matricula text not null,
  colaborador_nome text not null,
  campo text not null,
  valor_anterior text,
  valor_novo text,
  tipo text not null default 'edicao',
  user_id uuid references auth.users(id) on delete set null,
  user_nome text,
  created_at timestamptz not null default now()
);

create index idx_mov_colab on public.movimentacoes(colaborador_id);
create index idx_mov_created on public.movimentacoes(created_at desc);

alter table public.movimentacoes enable row level security;
create policy "Mov select autenticado" on public.movimentacoes for select to authenticated using (true);
create policy "Mov insert autenticado" on public.movimentacoes for insert to authenticated with check (true);

-- Solicitações
create type public.solicitacao_status as enum ('pendente', 'aprovada', 'rejeitada', 'cancelada');
create type public.solicitacao_tipo as enum ('transferencia_setor', 'mudanca_turno', 'mudanca_cargo', 'mudanca_lideranca', 'desligamento', 'outro');

create table public.solicitacoes (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  matricula text not null,
  colaborador_nome text not null,
  tipo public.solicitacao_tipo not null,
  descricao text not null,
  valor_atual text,
  valor_solicitado text,
  status public.solicitacao_status not null default 'pendente',
  motivo text,
  observacao_aprovador text,
  solicitante_id uuid references auth.users(id) on delete set null,
  solicitante_nome text,
  aprovador_id uuid references auth.users(id) on delete set null,
  aprovador_nome text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index idx_sol_status on public.solicitacoes(status);
create index idx_sol_colab on public.solicitacoes(colaborador_id);

alter table public.solicitacoes enable row level security;
create policy "Sol select autenticado" on public.solicitacoes for select to authenticated using (true);
create policy "Sol insert autenticado" on public.solicitacoes for insert to authenticated with check (auth.uid() = solicitante_id);
create policy "Sol update admin gestor" on public.solicitacoes for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'gestor'));

-- updated_at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create trigger tg_colaboradores_updated before update on public.colaboradores
  for each row execute function public.tg_set_updated_at();

create trigger tg_profiles_updated before update on public.profiles
  for each row execute function public.tg_set_updated_at();