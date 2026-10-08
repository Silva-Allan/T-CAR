-- ======================================================================
-- T-CAR 2.0 — Migration: Avaliações unificadas
-- ======================================================================
-- Uma avaliação agrupa várias baterias (tests) sob um nome, ex.:
-- "Pré-temporada Sub-15". Excluir a avaliação NÃO exclui os testes;
-- excluir um teste o remove automaticamente das avaliações.
--
-- Aplicada automaticamente pelo deploy (scripts/migrate.sh).
-- Idempotente: pode ser rodada mais de uma vez sem erro.
-- ======================================================================

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evaluations_user_id_idx on public.evaluations(user_id);

create table if not exists public.evaluation_tests (
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  primary key (evaluation_id, test_id)
);

create index if not exists evaluation_tests_test_id_idx on public.evaluation_tests(test_id);

-- Trigger updated_at (cria a função caso o banco não tenha vindo do schema.sql)
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_evaluations_updated on public.evaluations;
create trigger on_evaluations_updated
  before update on public.evaluations
  for each row execute procedure public.handle_updated_at();

-- ======================================================================
-- RLS
-- ======================================================================
alter table public.evaluations enable row level security;
alter table public.evaluation_tests enable row level security;

drop policy if exists "Users can view own evaluations" on public.evaluations;
create policy "Users can view own evaluations" on public.evaluations
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own evaluations" on public.evaluations;
create policy "Users can insert own evaluations" on public.evaluations
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own evaluations" on public.evaluations;
create policy "Users can update own evaluations" on public.evaluations
  for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own evaluations" on public.evaluations;
create policy "Users can delete own evaluations" on public.evaluations
  for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own evaluation tests" on public.evaluation_tests;
create policy "Users can view own evaluation tests" on public.evaluation_tests
  for select using (
    exists (
      select 1 from public.evaluations
      where evaluations.id = evaluation_tests.evaluation_id
      and evaluations.user_id = auth.uid()
    )
  );
-- Só permite vincular testes do próprio usuário a avaliações do próprio usuário
drop policy if exists "Users can insert own evaluation tests" on public.evaluation_tests;
create policy "Users can insert own evaluation tests" on public.evaluation_tests
  for insert with check (
    exists (
      select 1 from public.evaluations
      where evaluations.id = evaluation_tests.evaluation_id
      and evaluations.user_id = auth.uid()
    )
    and exists (
      select 1 from public.tests
      where tests.id = evaluation_tests.test_id
      and tests.user_id = auth.uid()
    )
  );
drop policy if exists "Users can delete own evaluation tests" on public.evaluation_tests;
create policy "Users can delete own evaluation tests" on public.evaluation_tests
  for delete using (
    exists (
      select 1 from public.evaluations
      where evaluations.id = evaluation_tests.evaluation_id
      and evaluations.user_id = auth.uid()
    )
  );

-- Postgres próprio: tabelas novas nem sempre herdam os grants do Supabase
grant select, insert, update, delete on public.evaluations to authenticated;
grant select, insert, delete on public.evaluation_tests to authenticated;
