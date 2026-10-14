-- ============================================================================
-- BharatSocial — India Pulse: User Stories feature (2026-10-14)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor) OR apply the
-- tables with `bunx prisma db push` when DATABASE_URL is available. Both
-- paths produce the same result.
--
-- SAFETY: purely ADDITIVE. Creates two new tables ("UserStory",
-- "UserStoryView"), adds two relation columns to "User", and creates the
-- `user-stories` storage bucket with owner-scoped policies. Nothing is
-- dropped, reset, or overwritten.
-- ============================================================================

-- ── 1. UserStory table ─────────────────────────────────────────────────────
-- Stores the 24h user stories (text / photo / video / link).
-- Live = expiresAt > now AND archivedAt IS NULL AND deletedAt IS NULL.
-- Archived = archivedAt IS NOT NULL (kept for 7-day creator archive).
-- Deleted = deletedAt IS NOT NULL (creator-initiated delete; purged by sweep).

CREATE TABLE IF NOT EXISTS "UserStory" (
  "id"              TEXT PRIMARY KEY NOT NULL,
  "authorId"        TEXT NOT NULL,
  "kind"            TEXT NOT NULL,                 -- "text" | "photo" | "video" | "link"
  "textContent"     TEXT,                          -- 1-200 chars; required for "text", optional caption otherwise
  "mediaUrl"        TEXT,                          -- Supabase Storage public URL for photo/video
  "mediaObjectPath" TEXT,                          -- Bucket-relative path (for orphan cleanup)
  "linkUrl"         TEXT,                          -- URL for "link" stories
  "linkPreview"     JSONB,                         -- OpenGraph metadata { title, description, image, url, siteName }
  "backgroundColor" TEXT NOT NULL DEFAULT 'saffron', -- palette key
  "textColor"       TEXT NOT NULL DEFAULT 'white',   -- "white" | "black"
  "expiresAt"       TIMESTAMP(3) NOT NULL,         -- createdAt + 24h
  "archivedAt"      TIMESTAMP(3),                  -- set by sweep when expiresAt passes
  "deletedAt"       TIMESTAMP(3),                  -- set when creator deletes
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserStory_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserStory_authorId_idx"        ON "UserStory"("authorId");
CREATE INDEX IF NOT EXISTS "UserStory_expiresAt_idx"       ON "UserStory"("expiresAt");
CREATE INDEX IF NOT EXISTS "UserStory_archivedAt_idx"      ON "UserStory"("archivedAt");
CREATE INDEX IF NOT EXISTS "UserStory_deletedAt_idx"       ON "UserStory"("deletedAt");
CREATE INDEX IF NOT EXISTS "UserStory_kind_idx"            ON "UserStory"("kind");

-- ── 2. UserStoryView table ─────────────────────────────────────────────────
-- One row per viewer per story. (storyId, viewerId) is unique — idempotent
-- "I viewed this story" marker.

CREATE TABLE IF NOT EXISTS "UserStoryView" (
  "id"        TEXT PRIMARY KEY NOT NULL,
  "storyId"   TEXT NOT NULL,
  "viewerId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserStoryView_storyId_fkey"  FOREIGN KEY ("storyId")  REFERENCES "UserStory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserStoryView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id")      ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserStoryView_storyId_viewerId_key" UNIQUE ("storyId", "viewerId")
);

CREATE INDEX IF NOT EXISTS "UserStoryView_storyId_idx"  ON "UserStoryView"("storyId");
CREATE INDEX IF NOT EXISTS "UserStoryView_viewerId_idx" ON "UserStoryView"("viewerId");

-- ── 3. Storage bucket for story media ──────────────────────────────────────
-- Public-read bucket: 50 MB cap (max video size). Per-type size caps are
-- ALSO enforced by the API route server-side (10 MB image, 50 MB video).
-- MIME allowlist covers JPEG / PNG / WebP (images) + MP4 / WebM / MOV (videos).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-stories',
  'user-stories',
  true,
  52428800, -- 50 MB
  ARRAY[
    'image/jpeg'::text,
    'image/png'::text,
    'image/webp'::text,
    'video/mp4'::text,
    'video/webm'::text,
    'video/quicktime'::text
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public             = true,
      file_size_limit    = 52428800,
      allowed_mime_types = ARRAY[
        'image/jpeg'::text,
        'image/png'::text,
        'image/webp'::text,
        'video/mp4'::text,
        'video/webm'::text,
        'video/quicktime'::text
      ];

-- ── 4. Storage policies (owner-scoped folders) ────────────────────────────
-- Objects live at user-stories/<owner-id>/<file>, where <owner-id> is the
-- Supabase auth user id (auth.uid()). These policies let SIGNED-IN users
-- manage ONLY their own folder. The service-role key path bypasses RLS but
-- is server-only and still derives the folder from the verified session.

-- Public read: anyone can read story media (stories are public).
DROP POLICY IF EXISTS "user-stories-public-read" ON storage.objects;
CREATE POLICY "user-stories-public-read" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-stories');

-- Owner write: a user can upload into their own folder only.
DROP POLICY IF EXISTS "user-stories-owner-insert" ON storage.objects;
CREATE POLICY "user-stories-owner-insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-stories'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Owner update: a user can update their own objects.
DROP POLICY IF EXISTS "user-stories-owner-update" ON storage.objects;
CREATE POLICY "user-stories-owner-update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-stories'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Owner delete: a user can delete their own objects.
DROP POLICY IF EXISTS "user-stories-owner-delete" ON storage.objects;
CREATE POLICY "user-stories-owner-delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-stories'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- ── 5. Optional: a cron to archive expired stories ────────────────────────
-- The API route already archives expired stories opportunistically on every
-- read, so this cron is OPTIONAL. If you want guaranteed archival even when
-- there's no traffic, uncomment the following pg_cron job:
--
-- SELECT cron.schedule(
--   'archive-expired-user-stories',
--   '*/15 * * * *',  -- every 15 minutes
--   $$
--     UPDATE "UserStory"
--     SET "archivedAt" = NOW()
--     WHERE "archivedAt" IS NULL
--       AND "deletedAt" IS NULL
--       AND "expiresAt" <= NOW();
--   $$
-- );
--
-- SELECT cron.schedule(
--   'purge-old-archived-user-stories',
--   '0 3 * * *',  -- daily at 3 AM
--   $$
--     DELETE FROM "UserStory"
--     WHERE "archivedAt" IS NOT NULL
--       AND "archivedAt" < NOW() - INTERVAL '7 days';
--   $$
-- );
--
-- NOTE: pg_cron must be enabled in Supabase (Dashboard → Database → Cron).
-- If you don't enable it, the on-read sweep in the API is sufficient.
