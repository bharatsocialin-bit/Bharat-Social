import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/getCurrentUser';
import { buildPublicProfile } from '@/lib/profile-server';

// ============================================================================
// GET /api/users/[username] — public profile + posts + follow/block state.
//
// Delegates to the shared builder in src/lib/profile-server.ts (same shape
// as GET /api/profile?id=…). Private fields (email, date of birth, gender,
// role, supabase ids) are never included; suspended users expose only a
// minimal payload.
// ============================================================================

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;

    if (!username || username.length < 3 || username.length > 30) {
      return NextResponse.json({ error: 'Invalid username.' }, { status: 400 });
    }

    const viewer = await getCurrentUser();
    const found = await db.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
    if (!found) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = await buildPublicProfile(found.id, { id: viewer?.id ?? null });
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile.' }, { status: 500 });
  }
}
