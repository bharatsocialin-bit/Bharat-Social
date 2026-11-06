-- ============================================================================
-- Lordsbook — Comic Bible artwork update (David and Goliath)
-- Run in Supabase SQL Editor. SAFETY: updates ONLY the David and Goliath
-- story's artwork pointers; no other rows, tables or features are touched.
--
-- What changed:
--   The first real comic artwork — "David and Goliath: Victory Through
--   Faith" — has been added to the project at
--     /public/comics/pages/david-goliath-spread-1.png   (1536×1024 PNG)
--   It is ONE pre-composed two-page spread (printed pages 1–2 inside the
--   artwork). The story therefore keeps exactly 1 page asset; the page
--   count must stay 1 — the printed page numbers are part of the artwork,
--   not proof that 2 separate page files exist.
--
-- The previous artwork file (david-goliath-p1.png) can remain on disk; it
-- simply becomes unreferenced after this update.
-- ============================================================================

-- 1. Point page 1 of the story at the new spread artwork.
UPDATE "ComicPage"
SET "imagePath" = '/comics/pages/david-goliath-spread-1.png',
    "isSpread"  = true
WHERE "storyId"  = 'comic-david-goliath'
  AND "pageNumber" = 1;

-- 2. Keep the library cover in sync with the artwork.
UPDATE "ComicStory"
SET "coverImagePath" = '/comics/pages/david-goliath-spread-1.png',
    "updatedAt"      = NOW()
WHERE "id" = 'comic-david-goliath';

-- ── Verification (optional) ────────────────────────────────────────────────
-- Expected: page_count = 1, image_path = /comics/pages/david-goliath-spread-1.png
-- SELECT s.id, s.title, s."coverImagePath",
--        count(p.id) AS page_count,
--        min(p."imagePath") AS image_path
-- FROM "ComicStory" s LEFT JOIN "ComicPage" p ON p."storyId" = s.id
-- WHERE s.id = 'comic-david-goliath'
-- GROUP BY s.id, s.title, s."coverImagePath";

-- Optional: align the story title with the new artwork's title.
-- (Commented out — the existing title stays unless you want this change.)
-- UPDATE "ComicStory"
-- SET "title" = 'David and Goliath: Victory Through Faith'
-- WHERE "id" = 'comic-david-goliath';
