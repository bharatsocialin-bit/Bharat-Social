'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * OAuth completion page (migration gate G7).
 *
 * The Supabase callback redirects here with a one-time 2-minute bridge
 * token. We immediately exchange it for a NextAuth session via the
 * 'supabase-token' credentials provider and bounce to the feed.
 *
 * Error states derived from URL params render synchronously; only async
 * signIn failures use state. The single-shot guard prevents React 18
 * StrictMode double-invoke from firing signIn twice.
 *
 * NOTE: useSearchParams() requires a <Suspense> boundary above the
 * component that calls it, otherwise `next build` fails prerendering with
 * "useSearchParams() should be wrapped in a suspense boundary" (this exact
 * error broke the Vercel deployments of G7). Hence the wrapper below.
 */

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: 'Sign-in with Google is not configured yet.',
  oauth_start_failed: 'Could not start Google sign-in. Please try again.',
  oauth_provider_error: 'Google sign-in was cancelled or failed.',
  missing_code: 'Sign-in link is incomplete.',
  code_exchange_failed: 'Sign-in session expired. Please try again.',
  identity_unavailable: 'Could not read your Google profile.',
  profile_link_failed: 'Could not link your profile. Please try again.',
  bridge_token_failed: 'Sign-in token could not be created.',
  account_suspended: 'This account has been suspended.',
  session_failed: 'Could not sign you in. Please try again.',
};

function OAuthCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attempted = useRef(false);
  const [asyncError, setAsyncError] = useState<string | null>(null);

  const oauthError = searchParams.get('error');
  const token = searchParams.get('token');

  // Sync error path: derived from URL during render — no effect needed.
  const error = oauthError
    ? (ERROR_MESSAGES[oauthError] || 'Sign-in failed.')
    : asyncError;

  const hasSyncError = Boolean(oauthError) || !token;

  useEffect(() => {
    if (attempted.current) return;
    // Skip the sign-in attempt entirely when the URL already carries an
    // error (or is missing the token) — the render above shows it.
    if (oauthError || !token) return;
    attempted.current = true;

    signIn('supabase-token', { token, redirect: false })
      .then((result) => {
        if (result?.error) {
          setAsyncError(ERROR_MESSAGES.session_failed);
          return;
        }
        // Full navigation so every server component picks up the new session.
        window.location.href = '/';
      })
      .catch(() => setAsyncError(ERROR_MESSAGES.session_failed));
  }, [oauthError, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        {error ? (
          <>
            <AlertCircle className="h-10 w-10 text-destructive" />
            <h1 className="text-lg font-bold text-white">Sign-in problem</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => router.replace('/')}
              className="mt-2 rounded-full bg-saffron px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-saffron/25 transition hover:brightness-110"
            >
              Back to home
            </button>
          </>
        ) : hasSyncError ? (
          <>
            <AlertCircle className="h-10 w-10 text-destructive" />
            <h1 className="text-lg font-bold text-white">Sign-in problem</h1>
            <p className="text-sm text-muted-foreground">{ERROR_MESSAGES.missing_code}</p>
            <button
              onClick={() => router.replace('/')}
              className="mt-2 rounded-full bg-saffron px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-saffron/25 transition hover:brightness-110"
            >
              Back to home
            </button>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-saffron" />
            <h1 className="text-lg font-bold text-white">Signing you in…</h1>
            <p className="text-sm text-muted-foreground">
              Completing your secure sign-in. This only takes a moment.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function OAuthCompleteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        <Loader2 className="h-10 w-10 animate-spin text-saffron" />
        <h1 className="text-lg font-bold text-white">Signing you in…</h1>
        <p className="text-sm text-muted-foreground">
          Completing your secure sign-in. This only takes a moment.
        </p>
      </div>
    </div>
  );
}

export default function OAuthCompletePage() {
  return (
    <Suspense fallback={<OAuthCompleteFallback />}>
      <OAuthCompleteContent />
    </Suspense>
  );
}
