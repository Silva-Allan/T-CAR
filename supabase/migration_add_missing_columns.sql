-- ======================================================================
-- T-CAR 2.0 — Migration: Add Missing Columns
-- ======================================================================
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- This adds all columns that exist in schema.sql but are missing from the DB.
-- ======================================================================

-- ======================================================================
-- TABLE: tests — add missing columns
-- ======================================================================
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS protocol_level integer NOT NULL DEFAULT 1
    CHECK (protocol_level IN (1, 2));

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS total_time numeric NOT NULL DEFAULT 0;

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS temperature numeric;

-- ======================================================================
-- TABLE: test_results — add missing columns
-- ======================================================================
ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS total_reps integer NOT NULL DEFAULT 0;

ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS pv_bruto numeric NOT NULL DEFAULT 0;

ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS pv_corrigido numeric NOT NULL DEFAULT 0;

ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS fc_final integer;

ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS fc_estimada integer;

-- ======================================================================
-- TABLE: athletes — add missing columns
-- ======================================================================
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS email text;

-- Note: gender uses an enum type. Create it if it doesn't exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_type') THEN
    CREATE TYPE public.gender_type AS ENUM ('M', 'F', 'Outro');
  END IF;
END$$;

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS gender public.gender_type;

-- ======================================================================
-- DONE! Verify by running:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'tests';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'test_results';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'athletes';
-- ======================================================================
