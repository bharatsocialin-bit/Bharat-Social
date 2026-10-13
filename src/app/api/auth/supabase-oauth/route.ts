import { NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/lib/supabase/route-client';
import { getPublicOrigin } from '@/lib/origin';

/**
 * GET /api/auth/supabase-oauth?provider=google   (migration gate G7)
 *
 * Kicks off the Supabase-mediated OAuth dance with PKCE:
 *   browser → here → redirect to Supabase (/auth/v1/authorize)
 *   → Google consent → Supabase → GET /api/auth/supabase-callback?code=…
 *
 * The PKCE code verifier is stored in a cookie by @supabase/ssr and is
 * consumed by the callback route.
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  // Public origin (proxy-aware) — never use url.origin here: behind a
  // preview/Vercel proxy request.url resolves to http://localhost:3000 and
  // the final OAuth redirect would land the user's browser on localhost.
  const publicOrigin = getPublicOrigin(request);
  const provider = url.searchParams.get('provider');

  // Only providers enabled in the Supabase dashboard are honored; google is
  // the one wired up for G7. Extend this list as providers are enabled.
  if (provider !== 'google') {
    return NextResponse.json(
      { error: 'Unsupported or unknown OAuth provider.' },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.redirect(new URL('/auth/oauth-complete?error=not_configured', publicOrigin));
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${publicOrigin}/api/auth/supabase-callback`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    console.error('signInWithOAuth error:', error?.message);
    return NextResponse.redirect(new URL('/auth/oauth-complete?error=oauth_start_failed', publicOrigin));
  }

  return NextResponse.redirect(data.url);
}
