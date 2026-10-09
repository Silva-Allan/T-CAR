-- ======================================================================
-- T-CAR 2.1 — Migration: Modalidade do atleta
-- ======================================================================
-- athletes.sport vinha do schema inicial como enum sport_type
-- ('athletics', 'cycling', 'other') e nunca foi usado pelo app.
-- Passa a ser texto com as modalidades do T-CAR:
--   football  — posições de futebol, classificação pela tabela de referência
--   handball  — posições de handebol, colocação no ranking
--   other     — outras modalidades / não atletas, sem posição
-- Todos os atletas já cadastrados são de futebol.
--
-- Aplicada automaticamente pelo deploy (scripts/migrate.sh).
-- Idempotente: pode ser rodada mais de uma vez sem erro.
-- ======================================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'athletes'
      and column_name = 'sport' and data_type = 'USER-DEFINED'
  ) then
    alter table public.athletes alter column sport drop default;
    alter table public.athletes alter column sport type text using sport::text;
  end if;
end $$;

alter table public.athletes add column if not exists sport text;

update public.athletes
  set sport = 'football'
  where sport is null or sport not in ('football', 'handball', 'other');

alter table public.athletes alter column sport set default 'football';
alter table public.athletes alter column sport set not null;

alter table public.athletes drop constraint if exists athletes_sport_check;
alter table public.athletes
  add constraint athletes_sport_check check (sport in ('football', 'handball', 'other'));

drop type if exists public.sport_type;
