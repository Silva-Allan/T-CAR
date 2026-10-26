-- ======================================================================
-- T-CAR 2.1 — Migration: Recorte salvo nas avaliações
-- ======================================================================
-- Uma avaliação pode guardar o recorte usado ao gerá-la, ex.:
--   {"sport": "football", "category": "Sub-15", "gender": "F"}
-- Chaves possíveis: sport, category, gender, team. null = todos os atletas.
-- Ao reabrir a avaliação, o relatório aplica o mesmo recorte.
--
-- Aplicada automaticamente pelo deploy (scripts/migrate.sh).
-- Idempotente: pode ser rodada mais de uma vez sem erro.
-- ======================================================================

alter table public.evaluations add column if not exists filters jsonb;

alter table public.evaluations drop constraint if exists evaluations_filters_check;
alter table public.evaluations
  add constraint evaluations_filters_check check (filters is null or jsonb_typeof(filters) = 'object');
