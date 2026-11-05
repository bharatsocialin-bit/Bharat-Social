import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';

// ============================================================================
// GET /api/bible/search?q=...&translation=...&page=1
//
// Searches Bible text via the YouVersion Platform API search endpoint.
// Requires YOUVERSION_APP_KEY (server-only).
//
// YouVersion Search API: GET /v1/search-verses?bible_id=X&q=QUERY
// Returns verse references (not text) — we resolve text via passages API.
//
// Auth required (to prevent abuse of the YouVersion API key).
// ============================================================================

const YV_API = 'https://api.youversion.com/v1';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to search the Bible.' }, { status: 401 });
    }

    const key = process.env.YOUVERSION_APP_KEY;
    if (!key) {
      return NextResponse.json({ error: 'Bible search is not configured.' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const translationId = searchParams.get('translation') || 'YV-BSB';

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters.' }, { status: 400 });
    }
    if (query.length > 200) {
      return NextResponse.json({ error: 'Search query is too long.' }, { status: 400 });
    }

    // Resolve the YouVersion Bible ID from our translation ID.
    // For helloao.org translations (KJV, WEB), fall back to BSB (ID 3034) for search.
    let yvBibleId: number;
    if (translationId.startsWith('YV-')) {
      // Extract the YouVersion ID from our translations list.
      const { getTranslation } = await import('@/lib/bible/translations');
      const t = getTranslation(translationId);
      yvBibleId = t?.youversionId ?? 3034; // Default to BSB
    } else {
      // helloao.org translations — use BSB for search since YV search is
      // the only search API we have. Results will be in BSB English, which
      // is acceptable for cross-translation search.
      yvBibleId = 3034;
    }

    // Call YouVersion's search-verses endpoint.
    const searchUrl = `${YV_API}/search-verses?bible_id=${yvBibleId}&q=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: { 'X-YVP-App-Key': key, 'Accept': 'application/json' },
      next: { revalidate: 300 }, // 5-minute cache for search results
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Search failed. Please try again.' }, { status: 502 });
    }

    const data = (await res.json()) as {
      verses?: Array<{
        reference: string; // e.g. "JHN.3.16"
        bible_id?: number;
      }>;
      did_you_mean?: string;
      search_instead_for?: string;
      user_intent?: string;
    };

    const verses = data.verses || [];
    
    // Parse the USFM references into structured data.
    const results = verses.map((v) => {
      const parts = v.reference.split('.');
      return {
        reference: v.reference,
        book: parts[0] || '',
        chapter: parseInt(parts[1] || '0', 10),
        verse: parseInt(parts[2] || '0', 10),
      };
    }).filter(r => r.book && r.chapter > 0 && r.verse > 0);

    return NextResponse.json({
      results,
      total: results.length,
      didYouMean: data.did_you_mean || null,
      searchInsteadFor: data.search_instead_for || null,
      query,
    });
  } catch (error) {
    console.error('Bible search error:', error);
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 });
  }
}
