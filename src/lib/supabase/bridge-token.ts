import crypto from 'crypto';

/**
 * OAuth bridge token (migration gate G7).
 *
 * Flow: Supabase callback route verifies the Google/email identity, maps it
 * to a local User row, then mints this short-lived signed token and hands it
 * to the /auth/oauth-complete page. That page calls NextAuth's
 * signIn('supabase-token', { token }) — the credentials provider verifies
 * the signature + expiry and issues the normal NextAuth JWT session.
 *
 * Why a signed token instead of reusing the Supabase access token: the
 * NextAuth credentials provider receives arbitrary client-supplied
 * credentials, so the token must be (a) unguessable, (b) expired within
 * minutes, and (c) bound to our NEXTAUTH_SECRET so a third party cannot
 * forge it. HMAC-SHA256 over a compact JSON payload gives all three.
 */

const MAX_AGE_SECONDS = 120; // 2 minutes — consumed immediately by oauth-complete

function getKey(): string | null {
  const secret = process.env.NEXTAUTH_SECRET || process.env.TEST_NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) return null;
  return secret;
}

function sign(payload: string, key: string): string {
  return crypto.createHmac('sha256', key).update(payload).digest('base64url');
}

export interface BridgeTokenPayload {
  /** local User.id (cuid) resolved/created by the callback route */
  uid: string;
  /** Supabase auth.users.id the identity was verified against */
  sid: string;
  /** issued-at, seconds */
  iat: number;
  /** expires-at, seconds */
  exp: number;
}

export function createBridgeToken(uid: string, sid: string): string | null {
  const key = getKey();
  if (!key) return null;
  const now = Math.floor(Date.now() / 1000);
  const payload: BridgeTokenPayload = { uid, sid, iat: now, exp: now + MAX_AGE_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, key)}`;
}

export function verifyBridgeToken(token: string): BridgeTokenPayload | null {
  const key = getKey();
  if (!key) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [body, mac] = parts;
  const expected = sign(body, key);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as BridgeTokenPayload;
    if (typeof payload.uid !== 'string' || typeof payload.sid !== 'string') return null;
    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
