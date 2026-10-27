/**
 * Production login test against the live Vercel deployment.
 * Tests: DATABASE_URL connectivity from Vercel -> Supabase Postgres,
 * NextAuth credentials flow (legacy bcrypt path with josh), session issuance.
 */
const BASE = 'https://bharat-social-mu.vercel.app';

async function main() {
  // CSRF
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const cookieJar = csrfRes.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  console.log(`csrf: OK (${csrfRes.status})`);

  // Login (legacy bcrypt user josh — exists in Supabase Postgres)
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieJar,
    },
    body: new URLSearchParams({
      email: 'josh@bharatsocial.test',
      password: 'TestPass123!',
      csrfToken,
      json: 'true',
    }).toString(),
    redirect: 'manual',
  });
  const loginCookies = loginRes.headers.getSetCookie();
  const hasSession = loginCookies.some((c) => c.includes('next-auth.session-token'));
  console.log(`login POST: ${loginRes.status}, session cookie: ${hasSession ? 'YES' : 'no'}`);

  // Session check
  const allCookies = [...cookieJar.split('; '), ...loginCookies.map((c) => c.split(';')[0])]
    .filter(Boolean)
    .join('; ');
  const sessRes = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: allCookies } });
  const sess = await sessRes.json();
  console.log(`session user: ${sess?.user?.email ?? '(none)'}`);

  // DB-backed API check (proves Postgres connectivity from Vercel functions)
  const quizRes = await fetch(`${BASE}/api/quiz/categories`);
  const quiz = await quizRes.json();
  const catCount = Array.isArray(quiz) ? quiz.length : quiz?.categories?.length;
  console.log(`quiz categories API: ${quizRes.status}, count: ${catCount ?? '?'}`);

  console.log('\n=========================');
  if (sess?.user?.email) {
    console.log('PRODUCTION STACK FULLY WORKING ✔ (Vercel <-> Supabase DB <-> NextAuth)');
  } else {
    console.log('PRODUCTION LOGIN FAILED ✘ — check NEXTAUTH_URL value and Vercel function logs');
  }
}

main().catch((e) => {
  console.error('script error:', e);
  process.exit(1);
});
