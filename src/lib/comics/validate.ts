import 'server-only';
import { db } from '@/lib/db';
import { BIBLE_BOOKS_BY_USFM } from '@/lib/bible/books';
import { checkArtworkReachable } from '@/lib/comics/storage';

/**
 * Publish validation for Comic Bible stories (Admin CMS).
 *
 * A story may only move Draft → Published when every one of these holds:
 *   - Story title exists.
 *   - Testament is OT or NT, and the selected Bible book/testament agree;
 *     chapter references are within the book's canonical chapter count.
 *   - Cover artwork exists and is reachable.
 *   - At least one comic page exists, and EVERY page's artwork is reachable
 *     (missing or broken artwork blocks publishing — always).
 *   - pageLayout is a known value.
 *   - The English (source) translation row exists and has a non-empty title —
 *     readers always have at least one complete language to read.
 */

export interface PublishIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: PublishIssue[];
  checks: Array<{ label: string; ok: boolean; detail?: string }>;
}

export async function validateStoryForPublish(storyId: string): Promise<ValidationResult> {
  const story = await db.comicStory.findUnique({
    where: { id: storyId },
    include: {
      pages: { orderBy: { pageNumber: 'asc' } },
      translations: { where: { languageCode: 'en' }, select: { languageCode: true, title: true, status: true } },
    },
  });

  const issues: PublishIssue[] = [];
  const checks: ValidationResult['checks'] = [];

  if (!story) {
    return {
      ok: false,
      issues: [{ field: 'story', message: 'Story not found.' }],
      checks: [{ label: 'Story exists', ok: false }],
    };
  }

  // ── Title ──
  const titleOk = !!story.title && story.title.trim().length > 0;
  checks.push({ label: 'Story title', ok: titleOk, detail: story.title ?? undefined });
  if (!titleOk) issues.push({ field: 'title', message: 'Story title is required.' });

  // ── Testament & Bible references ──
  const testamentOk = story.testament === 'OT' || story.testament === 'NT';
  checks.push({ label: 'Testament', ok: testamentOk, detail: story.testament });
  if (!testamentOk) issues.push({ field: 'testament', message: 'Testament must be OT or NT.' });

  if (story.bibleBook) {
    const book = BIBLE_BOOKS_BY_USFM[story.bibleBook];
    const bookOk = !!book;
    checks.push({ label: 'Bible book', ok: bookOk, detail: book ? `${book.name} (${book.usfm})` : story.bibleBook });
    if (!bookOk) {
      issues.push({ field: 'bibleBook', message: `Unknown Bible book code "${story.bibleBook}".` });
    } else {
      const testamentMatch = book.testament === story.testament;
      checks.push({
        label: 'Book matches testament',
        ok: testamentMatch,
        detail: `${book.name} is ${book.testament}`,
      });
      if (!testamentMatch) {
        issues.push({
          field: 'bibleBook',
          message: `${book.name} belongs to the ${book.testament} Testament but the story is marked ${story.testament}.`,
        });
      }
      if (story.bibleChapter != null) {
        const chapterOk = story.bibleChapter >= 1 && story.bibleChapter <= book.chapters;
        checks.push({
          label: 'Chapter in range',
          ok: chapterOk,
          detail: `Chapter ${story.bibleChapter} of ${book.chapters}`,
        });
        if (!chapterOk) {
          issues.push({
            field: 'bibleChapter',
            message: `${book.name} has ${book.chapters} chapters — chapter ${story.bibleChapter} is out of range.`,
          });
        }
      }
      if (story.bibleVerse != null && story.bibleVerse < 1) {
        issues.push({ field: 'bibleVerse', message: 'Verse reference must be a positive number.' });
      }
    }
  }

  // ── pageLayout ──
  const layoutOk = story.pageLayout === 'single' || story.pageLayout === 'spread';
  checks.push({ label: 'Page layout', ok: layoutOk, detail: story.pageLayout });
  if (!layoutOk) issues.push({ field: 'pageLayout', message: 'Page layout must be "single" or "spread".' });

  // ── Cover artwork ──
  const coverPath = story.coverImagePath;
  const coverSet = !!coverPath;
  const coverReachable = coverSet ? await checkArtworkReachable(coverPath as string) : false;
  checks.push({ label: 'Cover artwork', ok: coverReachable, detail: coverPath ?? 'missing' });
  if (!coverSet) {
    issues.push({ field: 'coverImagePath', message: 'A cover image is required before publishing.' });
  } else if (!coverReachable) {
    issues.push({ field: 'coverImagePath', message: 'Cover image file is missing or unreachable.' });
  }

  // ── Pages ──
  const pageRows = [...story.pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const hasPages = pageRows.length > 0;
  checks.push({ label: 'At least one comic page', ok: hasPages, detail: `${pageRows.length} page asset(s)` });
  if (!hasPages) {
    issues.push({ field: 'pages', message: 'Upload at least one comic page or spread before publishing.' });
  } else {
    // Every page image must resolve — never publish broken artwork.
    for (const page of pageRows) {
      const reachable = await checkArtworkReachable(page.imagePath);
      checks.push({
        label: `Page ${page.pageNumber} artwork`,
        ok: reachable,
        detail: page.imagePath,
      });
      if (!reachable) {
        issues.push({
          field: 'pages',
          message: `Page ${page.pageNumber} artwork is missing or broken (${page.imagePath}).`,
        });
      }
    }
  }

  // ── English (source) translation ──
  // Readers always need at least one complete language. English is the source
  // language for Lordsbook Comic Bible content, so it must exist with a title
  // before the story can go live. Other languages can be added later.
  const enTranslation = story.translations.find((t) => t.languageCode === 'en');
  const enTitleOk = !!enTranslation && !!enTranslation.title && enTranslation.title.trim().length > 0;
  checks.push({
    label: 'English translation title',
    ok: enTitleOk,
    detail: enTranslation ? `"${enTranslation.title}"` : 'no English translation row',
  });
  if (!enTranslation) {
    issues.push({
      field: 'translations',
      message: 'An English translation row is required before publishing (it is the source language).',
    });
  } else if (!enTitleOk) {
    issues.push({
      field: 'translations',
      message: 'The English translation must have a non-empty title before publishing.',
    });
  }

  return { ok: issues.length === 0, issues, checks };
}
