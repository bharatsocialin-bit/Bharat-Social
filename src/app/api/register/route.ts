import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSupabaseAuthClient, supabaseConfig } from '@/lib/supabase/server';
import { validateUsername } from '@/lib/profile';

/**
 * Registration (migration gate G7): Supabase Auth owns credentials.
 *
 * Flow: validate → local-uniqueness precheck → Supabase signUp → local
 * User row linked via supabaseUserId (passwordHash = null).
 *
 * Response contract (unchanged from the legacy route):
 *   201 { user: { id, email, username, name } }
 *   400/409 { error }
 * plus optional flag: emailConfirmationRequired=true when the project has
 * "Confirm email" enabled in Supabase (the caller must verify before login).
 */

export async function POST(request: Request) {
  try {
    const { email, username, password, name } = await request.json();

    // Validate input
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required.' },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 },
      );
    }

    // Validate username format + reserved words (shared rules with the
    // profile-edit PATCH route — src/lib/profile.ts is the single source).
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.ok) {
      return NextResponse.json({ error: usernameCheck.error }, { status: 400 });
    }

    // Validate name length if provided
    if (name && name.length > 100) {
      return NextResponse.json(
        { error: 'Name is too long (max 100 characters).' },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = usernameCheck.value; // already trimmed + lowercased

    const supabase = getSupabaseAuthClient();
    if (!supabase || !supabaseConfig()) {
      return NextResponse.json(
        {
          error:
            'Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        },
        { status: 503 },
      );
    }

    // Local uniqueness precheck — fast, friendly 409s before hitting Supabase.
    const existingEmail = await db.user.findUnique({ where: { email: cleanEmail } });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 },
      );
    }

    const existingUsername = await db.user.findUnique({ where: { username: cleanUsername } });
    if (existingUsername) {
      return NextResponse.json(
        { error: 'This username is already taken.' },
        { status: 409 },
      );
    }

    // ── Create the Supabase Auth identity ──
    // username/name ride along in user_metadata so OAuth-linking and
    // future flows can read them without touching the DB.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { username: cleanUsername, name: name || cleanUsername },
      },
    });

    if (signUpError || !signUpData.user) {
      const msg = signUpError?.message || '';
      // The identity already exists in Supabase but not locally (e.g. a
      // previous partially-failed signup). Surface as a conflict.
      if (/already|exists|registered/i.test(msg)) {
        return NextResponse.json(
          { error: 'An account with this email already exists.' },
          { status: 409 },
        );
      }
      if (/password/i.test(msg) && /short|weak|length/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      console.error('Supabase signUp error:', signUpError?.message);
      return NextResponse.json(
        { error: 'Registration failed. Please try again.' },
        { status: 502 },
      );
    }

    const supabaseUserId = signUpData.user.id;
    const emailConfirmed =
      !!signUpData.session || // confirmation disabled → auto signed-in
      (signUpData.user.email_confirmed_at != null && signUpData.user.email_confirmed_at !== '');

    // Generate initials from the name or username
    const displayName = name || cleanUsername;
    const initials = displayName
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    try {
      const user = await db.user.create({
        data: {
          email: cleanEmail,
          username: cleanUsername,
          passwordHash: null, // Supabase owns the credential from here on
          supabaseUserId,
          name: name || cleanUsername,
          initials,
          avatarGradient: 'from-sky-500 to-indigo-500',
          // Email registrants chose their username during signup — they have
          // completed onboarding and go straight to the feed.
          onboardedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
        },
      });

      return NextResponse.json(
        {
          user,
          emailConfirmationRequired: !emailConfirmed,
        },
        { status: 201 },
      );
    } catch (err) {
      // Handle the TOCTOU race: two concurrent register requests with the same
      // email or username can both pass the findUnique check above. The
      // Prisma unique constraint (P2002) catches it at insert time.
      // We translate it back to a 409 with the specific field that collided.
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
        const target = (err as { meta?: { target?: string[] } }).meta?.target || [];
        if (target.includes('email')) {
          return NextResponse.json(
            { error: 'An account with this email already exists.' },
            { status: 409 },
          );
        }
        if (target.includes('username')) {
          return NextResponse.json(
            { error: 'This username is already taken.' },
            { status: 409 },
          );
        }
        return NextResponse.json(
          { error: 'An account with these details already exists.' },
          { status: 409 },
        );
      }
      // NOTE: the Supabase identity already exists at this point but has no
      // local profile (orphan). Deleting it requires the service-role key,
      // which this app intentionally does not hold. The user can simply
      // register again with the same email once the local conflict is gone;
      // resolveIdentity() links by email on next sign-in.
      console.error('Local user create error after Supabase signUp:', err);
      return NextResponse.json(
        { error: 'An error occurred during registration.' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration.' },
      { status: 500 },
    );
  }
}
