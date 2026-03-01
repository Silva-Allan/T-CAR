-- ======================================================================
-- T-CAR 2.0 — Schema Completo
-- Protocolo T-CAR (Test de Course avec Accélération et Récupération)
-- ======================================================================

-- Extensões necessárias
create extension if not exists "uuid-ossp";

-- ======================================================================
-- TIPOS ENUM
-- ======================================================================
create type public.gender_type as enum ('M', 'F', 'Outro');

-- ======================================================================
-- TABELAS
-- ======================================================================

-- 1. Profiles (dados públicos do usuário/treinador)
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  full_name text,
  club text,
  location text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Trigger updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- 2. Athletes
create table public.athletes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  birth_date date,
  gender public.gender_type,
  team text,
  position text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create trigger on_athletes_updated
  before update on public.athletes
  for each row execute procedure public.handle_updated_at();

-- 3. Tests (sessão de teste)
create table public.tests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  protocol_level integer not null check (protocol_level in (1, 2)),
  total_time numeric not null,
  temperature numeric,
  notes text,
  synced boolean not null default true,
  created_at timestamptz default now() not null
);

-- 4. Test Results (resultado individual por atleta)
create table public.test_results (
  id uuid default uuid_generate_v4() primary key,
  test_id uuid not null references public.tests(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  athlete_name text not null,
  completed_stages integer not null,
  completed_reps_in_last_stage integer not null,
  total_reps integer not null default 0,
  is_last_stage_complete boolean not null default false,
  -- PV (Pico de Velocidade)
  pv_bruto numeric not null,
  pv_corrigido numeric not null,
  -- FC (Frequência Cardíaca)
  fc_final integer,
  fc_estimada integer,
  -- Metadados
  final_distance numeric not null,
  eliminated_by_failure boolean default false,
  created_at timestamptz default now() not null
);

-- ======================================================================
-- ROW LEVEL SECURITY (RLS)
-- ======================================================================
alter table public.profiles enable row level security;
alter table public.athletes enable row level security;
alter table public.tests enable row level security;
alter table public.test_results enable row level security;

-- Profiles
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Athletes
create policy "Users can view own athletes" on public.athletes
  for select using (auth.uid() = user_id);
create policy "Users can insert own athletes" on public.athletes
  for insert with check (auth.uid() = user_id);
create policy "Users can update own athletes" on public.athletes
  for update using (auth.uid() = user_id);
create policy "Users can delete own athletes" on public.athletes
  for delete using (auth.uid() = user_id);

-- Tests
create policy "Users can view own tests" on public.tests
  for select using (auth.uid() = user_id);
create policy "Users can insert own tests" on public.tests
  for insert with check (auth.uid() = user_id);
create policy "Users can update own tests" on public.tests
  for update using (auth.uid() = user_id);
create policy "Users can delete own tests" on public.tests
  for delete using (auth.uid() = user_id);

-- Test Results
create policy "Users can view own test results" on public.test_results
  for select using (
    exists (
      select 1 from public.tests
      where tests.id = test_results.test_id
      and tests.user_id = auth.uid()
    )
  );
create policy "Users can insert own test results" on public.test_results
  for insert with check (
    exists (
      select 1 from public.tests
      where tests.id = test_results.test_id
      and tests.user_id = auth.uid()
    )
  );
create policy "Users can update own test results" on public.test_results
  for update using (
    exists (
      select 1 from public.tests
      where tests.id = test_results.test_id
      and tests.user_id = auth.uid()
    )
  );
create policy "Users can delete own test results" on public.test_results
  for delete using (
    exists (
      select 1 from public.tests
      where tests.id = test_results.test_id
      and tests.user_id = auth.uid()
    )
  );

-- ======================================================================
-- TRIGGERS AUTOMÁTICOS
-- ======================================================================

-- Auto-criar perfil no signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, user_id, email, full_name)
  values (new.id, new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
