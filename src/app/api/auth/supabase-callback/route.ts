import { NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/lib/supabase/route-client';
import { resolveIdentity } from '@/lib/supabase/resolve-identity';
import { createBridgeToken } from '@/lib/supabase/bridge-token';
import { getPublicOrigin } from '@/lib/origin';

/**
 * GET /api/auth/supabase-callback?code=…   (migration gate G7)
 *
 * Terminal leg of the Supabase-mediated OAuth flow:
 *   1. Exchange ?code for a Supabase session using the PKCE verifier cookie.
 *   2. Read the verified identity (email, display name) from Supabase.
 *   3. resolveIdentity(): find-or-link-or-create the local User row.
 *   4. Mint a 2-minute HMAC bridge token and redirect to
 *      /auth/oauth-complete, which signs the user into NextAuth via the
 *      'supabase-token' credentials provider.
 *
 * Suspended users: the local row is returned with suspended=true; the
 * bridge token is still minted, but the credentials provider refuses to
 * authorize suspended accounts, so they land on the error state.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  // Proxy-aware public origin (see src/lib/origin.ts) — using url.origin
  // behind a preview/Vercel proxy would bounce the user to localhost.
  const publicOrigin = getPublicOrigin(request);
  const code = url.searchParams.get('code');
  const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error');

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/auth/oauth-complete?error=${reason}`, publicOrigin));

  if (oauthError) {
    console.error('Supabase OAuth error from provider:', oauthError);
    return fail('oauth_provider_error');
  }

  if (!code) return fail('missing_code');

  const supabase = await getSupabaseRouteClient();
  if (!supabase) return fail('not_configured');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error('exchangeCodeForSession error:', exchangeError.message);
    return fail('code_exchange_failed');
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.email) {
    console.error('getUser error:', userError?.message);
    return fail('identity_unavailable');
  }

  const meta = (userData.user.user_metadata || {}) as {
    name?: string;
    full_name?: string;
    user_name?: string;
  };
  const displayName = meta.name || meta.full_name || meta.user_name || null;

  let localUser;
  try {
    localUser = await resolveIdentity({
      supabaseUserId: userData.user.id,
      email: userData.user.email,
      name: displayName,
      avatarUrl: null,
    });
  } catch (err) {
    console.error('resolveIdentity error:', err);
    return fail('profile_link_failed');
  }

  if (localUser.suspended) return fail('account_suspended');

  const token = createBridgeToken(localUser.id, userData.user.id);
  if (!token) return fail('bridge_token_failed');

  return NextResponse.redirect(
    new URL(`/auth/oauth-complete?token=${encodeURIComponent(token)}`, publicOrigin),
  );
}
