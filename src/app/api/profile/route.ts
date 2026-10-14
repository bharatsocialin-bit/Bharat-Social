import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { buildPublicProfile } from '@/lib/profile-server';
import {
  BIO_MAX,
  validateUsername,
  validateLinks,
  validateGender,
  validateDateOfBirth,
  isOnboardingRequired,
  parseStoredLinks,
} from '@/lib/profile';
import type { ProfileLink } from '@/lib/types';

// ============================================================================
// GET /api/profile                     — current user's own profile (private
//                                        fields included; 401 when signed out)
// GET /api/profile?id=<userId>         — any user's PUBLIC profile (+posts)
// GET /api/profile?username=<username> — same public shape, lookup by handle
//
// PATCH /api/profile                   — update current user's profile.
//                                        Strictly whitelisted fields; role,
//                                        email, ids and suspension flags are
//                                        NEVER readable from the request body
//                                        (users cannot self-assign admin or
//                                        alter internal identifiers).
// ============================================================================

// Shape used for the signed-in user's own data (includes private fields).
function serializeOwnProfile(user: {
  id: string;
  email: string;
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  avatarGradient: string;
  initials: string;
  state: string | null;
  city: string | null;
  gender: string | null;
  dateOfBirth: Date | null;
  links: string;
  onboardedAt: Date | null;
  role: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    avatarGradient: user.avatarGradient,
    initials: user.initials,
    state: user.state,
    city: user.city,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
    links: parseStoredLinks(user.links),
    onboardingRequired: isOnboardingRequired(user),
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const id = searchParams.get('id');

    if (!username && !id) {
      // ── Own profile ──
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Re-fetch with the private fields getCurrentUser's public-safe select
      // does not include beyond what we need here.
      const full = await db.user.findUnique({
        where: { id: currentUser.id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          bio: true,
          avatarUrl: true,
          avatarGradient: true,
          initials: true,
          state: true,
          city: true,
          gender: true,
          dateOfBirth: true,
          links: true,
          onboardedAt: true,
          role: true,
          createdAt: true,
        },
      });
      if (!full) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ user: serializeOwnProfile(full) });
    }

    // ── Public profile of another user (or self viewed as a profile page) ──
    const viewer = await getCurrentUser();

    let targetId = id;
    if (!targetId && username) {
      if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
        return NextResponse.json({ error: 'Invalid username.' }, { status: 400 });
      }
      const found = await db.user.findUnique({
        where: { username: username.toLowerCase() },
        select: { id: true },
      });
      if (!found) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      targetId = found.id;
    }

    if (!targetId || typeof targetId !== 'string' || targetId.length < 8 || targetId.length > 64) {
      return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
    }

    const profile = await buildPublicProfile(targetId, { id: viewer?.id ?? null });
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile.' }, { status: 500 });
  }
}

// Whitelisted string fields that map straight onto User columns.
const PATCHABLE_STRING_FIELDS = ['name', 'bio', 'state', 'city', 'avatarGradient', 'initials'] as const;

const ALLOWED_GRADIENTS = [
  'from-sky-500 to-indigo-500',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-yellow-500 to-amber-600',
  'from-green-500 to-emerald-600',
  'from-red-500 to-rose-600',
  'from-fuchsia-500 to-purple-600',
];

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    // ── SECURITY: the request body can only influence the whitelist below.
    // role / email / id / supabaseUserId / suspended / passwordHash are NOT
    // read, so a client cannot self-promote to admin or touch identifiers.
    // ────────────────────────────────────────────────────────────────────────
    const update: Record<string, unknown> = {};

    // 1. Plain string fields (must be string | null | undefined).
    for (const field of PATCHABLE_STRING_FIELDS) {
      const v = body[field];
      if (v !== undefined && v !== null && typeof v !== 'string') {
        return NextResponse.json({ error: `Field "${field}" must be a string.` }, { status: 400 });
      }
    }

    const name = body.name as string | null | undefined;
    const bio = body.bio as string | null | undefined;
    const state = body.state as string | null | undefined;
    const city = body.city as string | null | undefined;
    const avatarGradient = body.avatarGradient as string | null | undefined;
    const initials = body.initials as string | null | undefined;

    if (name !== undefined && name !== null && name.length > 100) {
      return NextResponse.json({ error: 'Name is too long (max 100 characters).' }, { status: 400 });
    }
    // Per the profile spec, bio is capped at 200 characters.
    if (bio !== undefined && bio !== null && bio.length > BIO_MAX) {
      return NextResponse.json(
        { error: `Bio is too long (max ${BIO_MAX} characters).` },
        { status: 400 },
      );
    }
    if (state !== undefined && state !== null && state.length > 100) {
      return NextResponse.json({ error: 'State is too long.' }, { status: 400 });
    }
    if (city !== undefined && city !== null && city.length > 100) {
      return NextResponse.json({ error: 'City is too long.' }, { status: 400 });
    }
    if (initials !== undefined && initials !== null && initials.length > 4) {
      return NextResponse.json({ error: 'Initials are too long (max 4 characters).' }, { status: 400 });
    }
    if (initials !== undefined && initials !== null && initials.length > 0) {
      if (!/^[a-zA-Z]+$/.test(initials)) {
        return NextResponse.json({ error: 'Initials must contain only letters.' }, { status: 400 });
      }
    }
    if (avatarGradient !== undefined && avatarGradient !== null) {
      if (!ALLOWED_GRADIENTS.includes(avatarGradient)) {
        return NextResponse.json(
          { error: 'Invalid avatar gradient. Choose from the supported palette.' },
          { status: 400 },
        );
      }
    }

    if (name !== undefined) update.name = name === null || name.trim() === '' ? null : name;
    if (bio !== undefined) update.bio = bio === null || bio.trim() === '' ? null : bio;
    if (state !== undefined) update.state = state === null || state.trim() === '' ? null : state;
    if (city !== undefined) update.city = city === null || city.trim() === '' ? null : city;
    if (avatarGradient !== undefined) update.avatarGradient = avatarGradient;
    if (initials !== undefined) update.initials = initials === null ? 'Ne' : initials.toUpperCase();

    // 2. Username — format + reserved words + uniqueness (case-insensitive;
    //    stored lowercase like /api/register does).
    if (body.username !== undefined) {
      const check = validateUsername(body.username);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
      if (check.value !== currentUser.username) {
        const clash = await db.user.findUnique({ where: { username: check.value } });
        if (clash) {
          return NextResponse.json({ error: 'This username is already taken.' }, { status: 409 });
        }
        update.username = check.value;
      }
    }

    // 3. Gender — optional, allowlist.
    if (body.gender !== undefined) {
      const g = validateGender(body.gender);
      if (!g.ok) {
        return NextResponse.json({ error: g.error }, { status: 400 });
      }
      update.gender = g.value;
    }

    // 4. Date of birth — optional; server-enforced minimum-age policy.
    if (body.dateOfBirth !== undefined) {
      const d = validateDateOfBirth(body.dateOfBirth);
      if (!d.ok) {
        return NextResponse.json({ error: d.error }, { status: 400 });
      }
      update.dateOfBirth = d.date;
    }

    // 5. Links — optional, max 4, validated & order-preserving.
    if (body.links !== undefined) {
      const l = validateLinks(body.links);
      if (!l.ok) {
        return NextResponse.json({ error: l.error }, { status: 400 });
      }
      update.links = JSON.stringify(l.links satisfies ProfileLink[]);
    }

    // 6. Onboarding completion — a boolean, not a client-controlled date.
    if (body.completeOnboarding === true) {
      update.onboardedAt = new Date();
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    try {
      const updated = await db.user.update({
        where: { id: currentUser.id },
        data: update,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          bio: true,
          avatarUrl: true,
          avatarGradient: true,
          initials: true,
          state: true,
          city: true,
          gender: true,
          dateOfBirth: true,
          links: true,
          onboardedAt: true,
          role: true,
          createdAt: true,
        },
      });

      // ── Evaluate badges for the user (profile-updated trigger) —
      // fire-and-forget. Checks for "profile-complete" badge.
      const { evaluateAndAwardBadges } = await import('@/lib/badges/evaluator');
      evaluateAndAwardBadges({ type: 'profile-updated', userId: currentUser.id }).catch((e) => {
        console.error('Badge evaluation failed after profile update:', e);
      });

      return NextResponse.json({ user: serializeOwnProfile(updated) });
    } catch (err) {
      // TOCTOU guard: a concurrent signup could have claimed the username
      // between our findUnique and this update — the DB unique constraint
      // is the final authority.
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
        return NextResponse.json({ error: 'This username is already taken.' }, { status: 409 });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}
