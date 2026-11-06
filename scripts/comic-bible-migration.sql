-- ============================================================================
-- Lordsbook — Comic Bible (stories, pages, translations, bookmarks, progress)
-- Run in Supabase SQL Editor. SAFETY: purely ADDITIVE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "ComicStory" (
  "id"             TEXT PRIMARY KEY NOT NULL,
  "title"          TEXT NOT NULL,
  "testament"      TEXT NOT NULL,
  "category"       TEXT NOT NULL,
  "bibleBook"      TEXT,
  "bibleChapter"   INTEGER,
  "bibleVerse"     INTEGER,
  "coverImagePath" TEXT,
  "description"    TEXT,
  "keyVerse"       TEXT,
  "keyVerseRef"    TEXT,
  "lesson"         TEXT,
  "prayer"         TEXT,
  "isKidsFriendly" BOOLEAN NOT NULL DEFAULT false,
  "ageGroup"       TEXT,
  "pageLayout"     TEXT NOT NULL DEFAULT 'single',
  "published"      BOOLEAN NOT NULL DEFAULT false,
  "sortOrder"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ComicStory_testament_idx" ON "ComicStory"("testament");
CREATE INDEX IF NOT EXISTS "ComicStory_published_idx" ON "ComicStory"("published");
CREATE INDEX IF NOT EXISTS "ComicStory_isKidsFriendly_idx" ON "ComicStory"("isKidsFriendly");
CREATE INDEX IF NOT EXISTS "ComicStory_sortOrder_idx" ON "ComicStory"("sortOrder");

CREATE TABLE IF NOT EXISTS "ComicPage" (
  "id"           TEXT PRIMARY KEY NOT NULL,
  "storyId"      TEXT NOT NULL,
  "pageNumber"   INTEGER NOT NULL,
  "imagePath"    TEXT NOT NULL,
  "isSpread"     BOOLEAN NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComicPage_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "ComicStory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ComicPage_storyId_pageNumber_key" UNIQUE ("storyId", "pageNumber")
);
CREATE INDEX IF NOT EXISTS "ComicPage_storyId_idx" ON "ComicPage"("storyId");

CREATE TABLE IF NOT EXISTS "ComicTranslation" (
  "id"           TEXT PRIMARY KEY NOT NULL,
  "storyId"      TEXT NOT NULL,
  "languageCode" TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "introduction" TEXT,
  "narration"    TEXT,
  "dialogue"     TEXT,
  "captions"     TEXT,
  "scripture"    TEXT,
  "lesson"       TEXT,
  "prayer"       TEXT,
  "status"       TEXT NOT NULL DEFAULT 'draft',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComicTranslation_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "ComicStory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ComicTranslation_storyId_languageCode_key" UNIQUE ("storyId", "languageCode")
);
CREATE INDEX IF NOT EXISTS "ComicTranslation_storyId_idx" ON "ComicTranslation"("storyId");
CREATE INDEX IF NOT EXISTS "ComicTranslation_languageCode_idx" ON "ComicTranslation"("languageCode");
CREATE INDEX IF NOT EXISTS "ComicTranslation_status_idx" ON "ComicTranslation"("status");

CREATE TABLE IF NOT EXISTS "ComicBookmark" (
  "id"        TEXT PRIMARY KEY NOT NULL,
  "userId"    TEXT NOT NULL,
  "storyId"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComicBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ComicBookmark_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "ComicStory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ComicBookmark_userId_storyId_key" UNIQUE ("userId", "storyId")
);
CREATE INDEX IF NOT EXISTS "ComicBookmark_userId_idx" ON "ComicBookmark"("userId");

CREATE TABLE IF NOT EXISTS "ComicReadingProgress" (
  "id"           TEXT PRIMARY KEY NOT NULL,
  "userId"       TEXT NOT NULL,
  "storyId"      TEXT NOT NULL,
  "lastPageRead" INTEGER NOT NULL DEFAULT 1,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComicReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ComicReadingProgress_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "ComicStory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ComicReadingProgress_userId_storyId_key" UNIQUE ("userId", "storyId")
);
CREATE INDEX IF NOT EXISTS "ComicReadingProgress_userId_idx" ON "ComicReadingProgress"("userId");

-- ── Seed: David and Goliath demo story ─────────────────────────────────────
-- Uses the user-provided artwork at /public/comics/pages/david-goliath-p1.png
INSERT INTO "ComicStory" ("id", "title", "testament", "category", "bibleBook", "bibleChapter", "bibleVerse", "coverImagePath", "description", "keyVerse", "keyVerseRef", "lesson", "prayer", "isKidsFriendly", "pageLayout", "published", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'comic-david-goliath',
  'David and Goliath: Faithful Victory',
  'OT',
  'David and Goliath',
  '1SA',
  17,
  45,
  '/comics/pages/david-goliath-p1.png',
  'A young shepherd boy faces the giant Goliath with nothing but a sling and unshakeable faith in God. This is the timeless story of how true victory comes not from strength or size, but from trusting in the Lord.',
  'Victory does not come from strength or size, but from faith in God.',
  '1 Samuel 17:45',
  'David''s victory over Goliath teaches us that no challenge is too big when we trust in God. The world measures strength by weapons and size, but God looks at the heart. When we face our own "giants" — fear, doubt, temptation — we can remember that the battle belongs to the Lord.',
  'Lord, give me courage like David to face the giants in my life. Help me to trust that You are bigger than any challenge I face. In Jesus'' name, Amen.',
  true,
  'spread',
  true,
  1,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "ComicPage" ("id", "storyId", "pageNumber", "imagePath", "isSpread", "createdAt")
VALUES (
  'comic-page-dg-1',
  'comic-david-goliath',
  1,
  '/comics/pages/david-goliath-p1.png',
  true,
  NOW()
) ON CONFLICT ("storyId", "pageNumber") DO NOTHING;

INSERT INTO "ComicTranslation" ("id", "storyId", "languageCode", "title", "introduction", "narration", "status", "createdAt", "updatedAt")
VALUES (
  'comic-trans-dg-en',
  'comic-david-goliath',
  'en',
  'David and Goliath: Faithful Victory',
  'The Philistine giant Goliath challenges the armies of Israel. No soldier dares to face him — until a young shepherd boy named David steps forward, armed only with a sling and unshakeable faith in the living God.',
  'David said to the Philistine, "You come against me with sword and spear and javelin, but I come against you in the name of the Lord Almighty." — 1 Samuel 17:45',
  'published',
  NOW(),
  NOW()
) ON CONFLICT ("storyId", "languageCode") DO NOTHING;
