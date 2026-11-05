-- ============================================================================
-- Lordsbook — Add `country` field to User (global profile rebrand)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
--
-- SAFETY: purely ADDITIVE. Adds one nullable column to "User". Nothing is
-- dropped, reset, or overwritten. Existing users get country = NULL (they
-- can set it later via the edit-profile screen).
-- ============================================================================

-- ── 1. Add country column ──────────────────────────────────────────────────
-- Nullable so existing users are unaffected. Max 100 chars (matches the
-- state/city columns and the API validation).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "country" TEXT;

-- ── 2. Optional: backfill country = 'India' for users who already have a
--      state set (since the only state dropdown we had before was Indian
--      states, we can infer they're in India). Uncomment if you want this.
--
-- UPDATE "User" SET "country" = 'India'
--   WHERE "country" IS NULL AND "state" IS NOT NULL;

-- ── 3. Index for country-based queries (e.g. "find users in India") ────────
-- Skipped for now — the column is nullable and low-cardinality; an index
-- would only help if we add country-filtered search later. Add with:
-- CREATE INDEX IF NOT EXISTS "User_country_idx" ON "User"("country");
