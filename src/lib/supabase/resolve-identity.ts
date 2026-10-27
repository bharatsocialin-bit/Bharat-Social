import { db } from '@/lib/db';

/**
 * Resolve a verified Supabase Auth identity to a local User row (G7).
 *
 * Resolution order:
 *   1. supabaseUserId match  — returning user, done.
 *   2. email match           — pre-existing local user (e.g. registered via
 *      the legacy route): link the Supabase identity by writing
 *      supabaseUserId. This is how legacy accounts upgrade without a
 *      migration script.
 *   3. no match              — first sign-in: create the row. For OAuth
 *      identities we generate a unique username from the Google profile
 *      (email local-part or name), since Google does not supply one.
 *
 * Suspended users are returned with suspended=true; callers must treat
 * them as unauthenticated (getCurrentUser already does).
 */

export interface SupabaseIdentity {
  supabaseUserId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

const GRADIENTS = [
  'from-sky-500 to-indigo-500',
  'from-teal-500 to-emerald-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
];

function initialsFrom(nameOrEmail: string): string {
  const parts = nameOrEmail.replace(/[^a-zA-Z ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Ne';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

async function generateUsername(identity: SupabaseIdentity): Promise<string> {
  const base =
    identity.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 20) ||
    'user';

  // Prefer the exact base; otherwise append short numeric suffixes.
  if (!base || base.length < 3) {
    const fallback = `user${Date.now().toString(36)}`.slice(0, 30);
    return fallback;
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${Math.floor(Math.random() * 9000) + 100}`;
    const existing = await db.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
  }
  // Practically unreachable; deterministic last resort.
  return `${base}${Date.now().toString(36)}`.slice(0, 30);
}

export async function resolveIdentity(identity: SupabaseIdentity) {
  const email = identity.email.trim().toLowerCase();

  // 1. Linked already
  const bySupabaseId = await db.user.findUnique({
    where: { supabaseUserId: identity.supabaseUserId },
  });
  if (bySupabaseId) return bySupabaseId;

  // 2. Legacy/local user with the same email — link, don't duplicate
  const byEmail = await db.user.findUnique({ where: { email } });
  if (byEmail) {
    if (byEmail.suspended) return byEmail;
    return db.user.update({
      where: { id: byEmail.id },
      data: { supabaseUserId: identity.supabaseUserId },
    });
  }

  // 3. Brand-new user from OAuth — create with generated username
  const username = await generateUsername(identity);
  const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];

  return db.user.create({
    data: {
      email,
      username,
      passwordHash: null, // Supabase Auth owns the credential
      supabaseUserId: identity.supabaseUserId,
      name: identity.name?.slice(0, 100) || username,
      initials: initialsFrom(identity.name || email),
      avatarGradient: gradient,
    },
  });
}
