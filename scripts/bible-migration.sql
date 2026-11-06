-- ============================================================================
-- Lordsbook — Bible feature (Phase 1A: bookmarks + reading streak)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
--
-- SAFETY: purely ADDITIVE. Creates 3 new tables. Nothing is dropped, reset,
-- or overwritten. Translation text is fetched live from bolls.life +
-- bible-api.com (free, no key) — only user-specific data is stored here.
-- ============================================================================

-- ── 1. BibleBookmark ───────────────────────────────────────────────────────
-- One row per bookmarked verse. Composite unique prevents duplicate
-- bookmarks for the same verse by the same user.

CREATE TABLE IF NOT EXISTS "BibleBookmark" (
  "id"           TEXT PRIMARY KEY NOT NULL,
  "userId"       TEXT NOT NULL,
  "translation"  TEXT NOT NULL,                 -- e.g. "KJV", "WEB", "IRVHin"
  "book"         TEXT NOT NULL,                 -- e.g. "GEN", "JHN" (USFM ID)
  "bookName"     TEXT NOT NULL,                 -- e.g. "Genesis", "John"
  "chapter"      INTEGER NOT NULL,
  "verse"        INTEGER NOT NULL,
  "note"         TEXT,                          -- optional user note
  "verseText"    TEXT NOT NULL,                 -- cached verse text for fast list rendering
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BibleBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BibleBookmark_userId_translation_book_chapter_verse_key" UNIQUE ("userId", "translation", "book", "chapter", "verse")
);

CREATE INDEX IF NOT EXISTS "BibleBookmark_userId_idx"            ON "BibleBookmark"("userId");
CREATE INDEX IF NOT EXISTS "BibleBookmark_userId_translation_idx" ON "BibleBookmark"("userId", "translation");

-- ── 2. BibleReadingStreak ──────────────────────────────────────────────────
-- One row per user (userId is unique). Tracks current + longest streak +
-- total days read.

CREATE TABLE IF NOT EXISTS "BibleReadingStreak" (
  "id"             TEXT PRIMARY KEY NOT NULL,
  "userId"         TEXT NOT NULL UNIQUE,
  "currentStreak"  INTEGER NOT NULL DEFAULT 0,
  "longestStreak"  INTEGER NOT NULL DEFAULT 0,
  "lastReadDate"   TIMESTAMP(3),                -- midnight UTC of last read day
  "totalReadDays"  INTEGER NOT NULL DEFAULT 0,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BibleReadingStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ── 3. BibleReadingDay ─────────────────────────────────────────────────────
-- One row per day the user read anything. Composite unique on (userId, date)
-- prevents duplicate day records.

CREATE TABLE IF NOT EXISTS "BibleReadingDay" (
  "id"        TEXT PRIMARY KEY NOT NULL,
  "userId"    TEXT NOT NULL,
  "date"      TIMESTAMP(3) NOT NULL,            -- midnight UTC of the day read
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BibleReadingDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BibleReadingDay_userId_date_key" UNIQUE ("userId", "date")
);

CREATE INDEX IF NOT EXISTS "BibleReadingDay_userId_date_idx" ON "BibleReadingDay"("userId", "date");
