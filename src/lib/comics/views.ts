/**
 * Comic Bible reader view model — SHARED between the public reader
 * (ComicBibleView) and the Admin CMS preview (feature: Comic Bible Admin
 * CMS). One definition so an admin always previews exactly what readers
 * will see.
 *
 * A "view" is one navigation step on the reader canvas. Assets uploaded as a
 * pre-composed two-page spread (ComicPage.isSpread = true) always render
 * ALONE, at full width — the left and right printed pages are already inside
 * the artwork and must never be split, cropped or faked. Individual page
 * assets in a 'spread'-layout story pair up side-by-side on desktop only
 * (mobile always shows one page at a time), so the same story is ready for
 * per-page artwork the moment individual page files are uploaded.
 */

export interface ReaderComicPage {
  id: string;
  pageNumber: number;
  imagePath: string;
  isSpread: boolean;
}

export interface ReaderView {
  pages: ReaderComicPage[];        // 1 (spread/single) or 2 (pair) assets
  kind: 'spread' | 'single' | 'pair';
  firstPage: number;               // smallest pageNumber in the view (progress key)
}

export function buildViews(pages: ReaderComicPage[], isDesktop: boolean): ReaderView[] {
  const views: ReaderView[] = [];
  let i = 0;
  while (i < pages.length) {
    const page = pages[i];
    if (page.isSpread) {
      // One pre-composed spread asset = one view, rendered full width.
      views.push({ pages: [page], kind: 'spread', firstPage: page.pageNumber });
      i += 1;
      continue;
    }
    // Desktop: pair two consecutive individual pages (spread-layout stories).
    const next = pages[i + 1];
    const canPair = isDesktop && next !== undefined && !next.isSpread;
    if (canPair) {
      views.push({ pages: [page, next], kind: 'pair', firstPage: page.pageNumber });
      i += 2;
    } else {
      views.push({ pages: [page], kind: 'single', firstPage: page.pageNumber });
      i += 1;
    }
  }
  return views;
}

/** Bottom-bar counter text — always derived from REAL asset metadata. */
export function viewLabel(
  view: ReaderView | undefined,
  viewIndex: number,
  views: ReaderView[],
  totalPages: number,
): string {
  if (!view) return '';
  if (view.kind === 'spread') {
    const spreadNo = views.slice(0, viewIndex + 1).filter((v) => v.kind === 'spread').length;
    const spreadTotal = views.filter((v) => v.kind === 'spread').length;
    return spreadTotal === 1 ? 'Spread 1 of 1' : `Spread ${spreadNo} of ${spreadTotal}`;
  }
  if (view.kind === 'pair' && view.pages.length === 2) {
    return `Pages ${view.pages[0].pageNumber}–${view.pages[1].pageNumber} of ${totalPages}`;
  }
  return `Page ${view.pages[0].pageNumber} of ${totalPages}`;
}

/** Compact summary for library cards / admin lists, e.g. "1 spread" or "3 pages · 1 spread". */
export function pageSummary(pageCount: number, spreadAssets: number): string {
  const singles = pageCount - spreadAssets;
  if (spreadAssets > 0 && singles === 0) {
    return spreadAssets === 1 ? '1 spread' : `${spreadAssets} spreads`;
  }
  const parts: string[] = [];
  if (singles > 0) parts.push(`${singles} page${singles === 1 ? '' : 's'}`);
  if (spreadAssets > 0) parts.push(`${spreadAssets} spread${spreadAssets === 1 ? '' : 's'}`);
  return parts.join(' · ') || 'No artwork yet';
}
