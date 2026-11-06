-- ============================================================================
-- Lordsbook — Bible features (highlights, notes, reading history)
-- Run this in the Supabase SQL Editor.
-- SAFETY: purely ADDITIVE.
-- ============================================================================

-- 1. Add highlightColor column to BibleBookmark (if not exists)
ALTER TABLE "BibleBookmark" ADD COLUMN IF NOT EXISTS "highlightColor" TEXT;

-- 2. BibleNote table
CREATE TABLE IF NOT EXISTS "BibleNote" (
  "id"           TEXT PRIMARY KEY NOT NULL,
  "userId"       TEXT NOT NULL,
  "translation"  TEXT NOT NULL,
  "book"         TEXT NOT NULL,
  "bookName"     TEXT NOT NULL,
  "chapter"      INTEGER NOT NULL,
  "verse"        INTEGER NOT NULL,
  "content"      TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BibleNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BibleNote_userId_translation_book_chapter_verse_key" UNIQUE ("userId", "translation", "book", "chapter", "verse")
);
CREATE INDEX IF NOT EXISTS "BibleNote_userId_idx" ON "BibleNote"("userId");
CREATE INDEX IF NOT EXISTS "BibleNote_userId_translation_idx" ON "BibleNote"("userId", "translation");

-- 3. BibleReadingHistory table
CREATE TABLE IF NOT EXISTS "BibleReadingHistory" (
  "id"           TEXT PRIMARY KEY NOT NULL,
  "userId"       TEXT NOT NULL,
  "translation"  TEXT NOT NULL,
  "book"         TEXT NOT NULL,
  "bookName"     TEXT NOT NULL,
  "chapter"      INTEGER NOT NULL,
  "readAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BibleReadingHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BibleReadingHistory_userId_translation_book_chapter_key" UNIQUE ("userId", "translation", "book", "chapter")
);
CREATE INDEX IF NOT EXISTS "BibleReadingHistory_userId_readAt_idx" ON "BibleReadingHistory"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "BibleReadingHistory_userId_translation_idx" ON "BibleReadingHistory"("userId", "translation");
