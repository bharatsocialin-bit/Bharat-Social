import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';

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

    // Validate username format (alphanumeric + underscore, 3-30 chars)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-30 characters, using only letters, numbers, and underscores.' },
        { status: 400 },
      );
    }

    // Validate name length if provided
    if (name && name.length > 100) {
      return NextResponse.json(
        { error: 'Name is too long (max 100 characters).' },
        { status: 400 },
      );
    }

    // Check if email or username already exists
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
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

    // Hash the password and create the user
    const passwordHash = await hashPassword(password);

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
          passwordHash,
          name: name || cleanUsername,
          initials,
          avatarGradient: 'from-sky-500 to-indigo-500',
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
        },
      });

      return NextResponse.json({ user }, { status: 201 });
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
      throw err; // Re-throw to be caught by the outer try/catch → 500.
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration.' },
      { status: 500 },
    );
  }
}
