-- ============================================================================
-- BharatSocial — Profile Setup & Editing feature (2026-10-14)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor) OR apply the
-- columns with `bunx prisma db push` when DATABASE_URL is available. Both
-- paths produce the same result.
--
-- SAFETY: purely ADDITIVE. Adds 5 nullable columns to "User", backfills
-- `onboardedAt` on existing rows, and creates the `avatars` storage bucket
-- with owner-scoped policies. Nothing is dropped, reset, or overwritten.
-- ============================================================================

-- ── 1. New profile columns on "User" (all nullable / defaulted) ────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl"   TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender"      TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "links"       TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardedAt" TIMESTAMP(3);

-- ── 2. Backfill onboarding flag ─────────────────────────────────────────────
-- Every EXISTING user already has a username (they registered or signed in
-- before this feature existed), so they must NOT be forced through the new
-- "Complete your profile" flow. Mark them onboarded using their creation
-- timestamp. Rows created AFTER this migration keep onboardedAt = NULL and
-- will be guided through onboarding on first sign-in.
UPDATE "User" SET "onboardedAt" = "createdAt" WHERE "onboardedAt" IS NULL;

-- ── 3. Storage bucket for profile photos ───────────────────────────────────
-- Public-read bucket: 5 MB limit, images only. The bucket-level limits are
-- enforced by Supabase Storage itself (defense in depth — the upload API
-- route validates again server-side).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'image/gif'::text]
)
ON CONFLICT (id) DO UPDATE
  SET public            = true,
      file_size_limit   = 5242880,
      allowed_mime_types = ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'image/gif'::text];

-- ── 4. Storage policies (owner-scoped folders) ─────────────────────────────
-- Objects live at avatars/<owner-id>/<file>, where <owner-id> is the
-- Supabase auth user id (auth.uid()). These policies let SIGNED-IN users
-- manage ONLY their own folder. They are what makes the non-service-key
-- upload path (cookie / stashed-token) safe. The service-role key path
-- bypasses RLS but is server-only and still derives the folder from the
-- verified session, never from client input.
--
-- Idempotent: drop + recreate.
DROP POLICY IF EXISTS "avatars_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete"  ON storage.objects;

CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
