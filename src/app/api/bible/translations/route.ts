import { NextResponse } from 'next/server';
import { translationsByLanguage } from '@/lib/bible/translations';

// GET /api/bible/translations — list all available Bible translations,
// grouped by language. Public (no auth required) — anyone can browse
// translations without signing in.
export async function GET() {
  try {
    const groups = translationsByLanguage();
    return NextResponse.json({
      groups,
      total: groups.reduce((n, g) => n + g.translations.length, 0),
    });
  } catch (error) {
    console.error('Bible translations list error:', error);
    return NextResponse.json({ error: 'Failed to load translations.' }, { status: 500 });
  }
}
