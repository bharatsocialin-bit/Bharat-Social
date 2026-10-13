import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/password';

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
    CredentialsProvider({
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

        if (!user || !user.passwordHash) {
          return null;
        }

        // Reject suspended users at login time
        if (user.suspended) {
          return null;
        }

        const isValid = await verifyPassword(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.username,
          image: null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
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
