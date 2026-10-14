import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { getSupabaseAuthClient } from '@/lib/supabase/server';
import { verifyBridgeToken } from '@/lib/supabase/bridge-token';

/**
 * Resolve the NextAuth JWT secret. CRITICAL: do NOT fall back to a hardcoded
 * string — that would let anyone with repo access forge valid JWTs for any
 * user (including admins). The app MUST refuse to serve requests if
 * NEXTAUTH_SECRET is missing.
 *
 * This function is called lazily (at request time via the `secret` getter
 * below) rather than at module-evaluation time. This is essential because
 * `next build` evaluates all modules to collect page data — if this throws
 * during the build, the build fails with "Failed to collect page data."
 * By deferring to runtime, the build succeeds and the check only fires
 * when a real request arrives (at which point the env var must be set).
 *
 * The only allowed escape hatch is for the local automated test suite,
 * which sets TEST_NEXTAUTH_SECRET so it can run without a real .env file.
 */
function getRequiredSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.TEST_NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'NEXTAUTH_SECRET environment variable is required and must be at least 16 characters. ' +
      'Refusing to start without a secure secret. ' +
      'Generate one with: openssl rand -base64 32',
    );
  }
  // Reject the historical hardcoded fallback explicitly.
  if (secret === 'dev-secret-change-in-production') {
    throw new Error(
      'NEXTAUTH_SECRET is set to the known-insecure hardcoded fallback. ' +
      'Refusing to start. Generate a new secret with: openssl rand -base64 32',
    );
  }
  return secret;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    // ── Email + password ────────────────────────────────────────────────
    // G7: password verification is delegated to Supabase Auth. Legacy
    // pre-G7 users (local bcrypt hash, no supabaseUserId) are still
    // verified locally so nothing breaks before accounts are migrated.
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;
        if (user.suspended) return null;

        // ── Path A: Supabase-managed user (or linked legacy user) ──
        if (user.supabaseUserId || !user.passwordHash) {
          const supabase = getSupabaseAuthClient();
          if (!supabase) return null; // Supabase not configured — cannot verify

          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });
          if (error || !data.user) return null;

          // Supabase identity must match the linked row (or link it now
          // for legacy users signing in through Supabase for the first
          // time with the password they originally registered with).
          if (user.supabaseUserId && data.user.id !== user.supabaseUserId) {
            return null;
          }
          if (!user.supabaseUserId) {
            await db.user.update({
              where: { id: user.id },
              data: { supabaseUserId: data.user.id },
            });
          }

          // Stash the Supabase session tokens in the NextAuth JWT so
          // server routes (e.g. avatar storage) can act as this user with
          // Storage RLS applied. The tokens live ONLY in the signed,
          // httpOnly JWT cookie — the session callback below never copies
          // them into the client-visible session object.
          return {
            id: user.id,
            email: user.email,
            name: user.name || user.username,
            image: null,
            sbAccessToken: data.session?.access_token ?? null,
            sbRefreshToken: data.session?.refresh_token ?? null,
          };
        }

        // ── Path B: legacy local bcrypt user ──
        const isValid = await verifyPassword(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.username,
          image: null,
        };
      },
    }),

    // ── Supabase OAuth bridge (Google etc.) ─────────────────────────────
    // Consumes the short-lived HMAC bridge token minted by
    // /api/auth/supabase-callback after the Supabase code exchange. The
    // local User row ALREADY exists at this point (created by the
    // callback), so this provider only verifies and loads.
    CredentialsProvider({
      id: 'supabase-token',
      name: 'Supabase OAuth',
      credentials: {
        token: { label: 'Bridge Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.token) return null;

        const payload = verifyBridgeToken(credentials.token);
        if (!payload) return null;

        const user = await db.user.findUnique({ where: { id: payload.uid } });
        if (!user) return null;
        if (user.suspended) return null;
        // Token must reference the identity it was minted for.
        if (user.supabaseUserId && user.supabaseUserId !== payload.sid) return null;

        return { id: user.id, email: user.email, name: user.name || user.username, image: null };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Persist the Supabase tokens issued at sign-in (email path). OAuth
        // users instead carry their Supabase session in sb-* cookies, so
        // nothing needs stashing for them here.
        const sbat = (user as { sbAccessToken?: unknown }).sbAccessToken;
        const sbrt = (user as { sbRefreshToken?: unknown }).sbRefreshToken;
        if (typeof sbat === 'string' && typeof sbrt === 'string') {
          token.sbAccessToken = sbat;
          token.sbRefreshToken = sbrt;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Attach the DB user ID to the session
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  // Resolve the secret lazily via a getter so that `next build` does not
  // execute getRequiredSecret() during module evaluation (page-data
  // collection). The getter fires at request time, when the env var
  // is guaranteed to be set in the runtime environment.
  // NextAuth v4 reads `secret` once per request, so this is safe.
  get secret() {
    return getRequiredSecret();
  },
};
