import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { validateUsername } from '@/lib/profile';

// ============================================================================
// GET /api/profile/check-username?username=<candidate>&current=<own username>
//
// Live availability feedback for the onboarding and edit-profile forms.
// Order of checks: format → reserved words → taken. The final authority is
// still the DB unique constraint at save time (PATCH re-validates and has a
// P2002 race guard) — this endpoint is UX, not the security boundary.
// ============================================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get('username');
    const current = searchParams.get('current');

    if (raw === null) {
      return NextResponse.json({ error: 'username query parameter is required.' }, { status: 400 });
    }

    // Format + reserved-word validation (shared rules with PATCH/register).
    const check = validateUsername(raw);
    if (!check.ok) {
      return NextResponse.json({ available: false, reason: check.error });
    }

    // Keeping your own username is always fine.
    if (current && check.value === current.trim().toLowerCase()) {
      return NextResponse.json({ available: true });
    }

    const existing = await db.user.findUnique({
      where: { username: check.value },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ available: false, reason: 'This username is already taken.' });
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json({ error: 'Failed to check username.' }, { status: 500 });
  }
}
