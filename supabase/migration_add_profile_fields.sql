-- Migration: Add club and location fields to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS club text,
  ADD COLUMN IF NOT EXISTS location text;
