import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ── GET /api/quiz/categories ────────────────────────────────────────────────
// Returns the list of quiz categories with the count of PUBLISHED questions
// in each. Categories themselves are static config (defined in code) but
// the question counts come from the DB so the UI reflects what's actually
// available to play.
export async function GET() {
  try {
    // Group published questions by categoryId.
    const rows = await db.quizQuestion.groupBy({
      by: ['categoryId'],
      where: { published: true },
      _count: { id: true },
    });
    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[r.categoryId] = r._count.id;
    }

    // Static category metadata — mirrors src/data/quiz-categories.ts.
    // Kept in code because it changes rarely and avoids a DB round-trip.
    const categories = [
      { id: 'cat-gk', label: 'India General Knowledge', description: 'Facts about India — landmarks, symbols, firsts and more.', icon: 'lightbulb', gradient: 'from-teal-500 to-emerald-600' },
      { id: 'cat-history', label: 'Indian History', description: 'From ancient empires to independence — test your history.', icon: 'scroll', gradient: 'from-amber-500 to-orange-600' },
      { id: 'cat-geography', label: 'Geography and Indian States', description: 'Rivers, mountains, capitals and state trivia.', icon: 'map', gradient: 'from-sky-500 to-blue-600' },
      { id: 'cat-civics', label: 'Constitution and Civics', description: 'Fundamental rights, parliament, electoral system.', icon: 'scale', gradient: 'from-saffron to-amber-600' },
      { id: 'cat-science', label: 'Science and Technology', description: 'ISRO, scientists, inventions and space missions.', icon: 'flask-conical', gradient: 'from-violet-500 to-purple-600' },
      { id: 'cat-sports', label: 'Cricket and Sports', description: 'Cricket legends, Olympics, records and Indian athletes.', icon: 'trophy', gradient: 'from-lime-500 to-green-600' },
      { id: 'cat-culture', label: 'Culture and Heritage', description: 'Festivals, cuisines, dance forms and cultural traditions.', icon: 'sparkles', gradient: 'from-rose-500 to-pink-600' },
      { id: 'cat-edu', label: 'Education and Exam Practice', description: 'Practice questions modelled on competitive exam patterns.', icon: 'graduation-cap', gradient: 'from-indigo-500 to-violet-600' },
      { id: 'cat-economy', label: 'Economy', description: 'Banking, budget, GDP, RBI, and Indian economic milestones.', icon: 'banknote', gradient: 'from-emerald-600 to-teal-700' },
      { id: 'cat-environment', label: 'Environment and Wildlife', description: 'National parks, biodiversity, climate, and conservation.', icon: 'leaf', gradient: 'from-green-500 to-emerald-700' },
      { id: 'cat-art', label: 'Art, Literature and Languages', description: 'Indian art, classical literature, and linguistic heritage.', icon: 'palette', gradient: 'from-fuchsia-500 to-purple-700' },
    ];

    return NextResponse.json({
      categories: categories.map((c) => ({
        ...c,
        questionsCount: counts[c.id] || 0,
      })),
    });
  } catch (e) {
    console.error('Error fetching quiz categories:', e);
    return NextResponse.json({ error: 'Failed to fetch categories.' }, { status: 500 });
  }
}
