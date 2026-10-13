/**
 * End-to-end verification after user completed Supabase dashboard config:
 *  1) Email login for priya.sharma.in@gmail.com (was blocked by "Email not confirmed")
 *  2) Google OAuth start endpoint (was returning ?error=not_configured)
 */
const BASE = 'http://localhost:3000';

// ---------- 1) OAuth start check ----------
async function checkOauthStart() {
  const res = await fetch(`${BASE}/api/auth/supabase-oauth?provider=google`, {
    redirect: 'manual',
  });
  const loc = res.headers.get('location') || '(no location header)';
  const status = res.status;

  let verdict;
  if (status === 302 || status === 307) {
    if (loc.includes('accounts.google.com')) {
      verdict = 'PASS — redirects to Google consent screen';
    } else if (loc.includes('/auth/error') || loc.includes('error=')) {
      verdict = `FAIL — redirect to error page: ${loc}`;
    } else if (loc.includes('supabase.co/auth/v1/authorize')) {
      verdict = 'PASS (intermediate) — redirects to Supabase authorize (will 302 to Google)';
    } else {
      verdict = `UNKNOWN — redirect to: ${loc}`;
    }
  } else {
    verdict = `FAIL — HTTP ${status}, no redirect`;
  }
  console.log('=== Google OAuth start ===');
  console.log(`status: ${status}`);
  console.log(`location: ${loc.slice(0, 200)}`);
  console.log(`verdict: ${verdict}\n`);
  return verdict.startsWith('PASS');
}

// ---------- 2) Email login check (NextAuth credentials -> Supabase signInWithPassword) ----------
async function checkEmailLogin(email, password) {
  // Step A: get CSRF token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const cookies = csrfRes.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');

  // Step B: POST credentials to NextAuth callback
  const body = new URLSearchParams({
    email,
    password,
    csrfToken,
    json: 'true',
  });
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies,
    },
    body: body.toString(),
    redirect: 'manual',
  });

  const loginCookies = loginRes.headers.getSetCookie();
  const sessionCookie = loginCookies.find((c) => c.includes('next-auth.session-token'));
  const allCookies = [...cookies.split('; '), ...loginCookies.map((c) => c.split(';')[0])]
    .filter(Boolean)
    .join('; ');

  // Step C: verify session with the returned cookie
  let sessionOk = false;
  let sessionData = null;
  if (sessionCookie) {
    const sessRes = await fetch(`${BASE}/api/auth/session`, {
      headers: { Cookie: allCookies },
    });
    sessionData = await sessRes.json();
    sessionOk = Boolean(sessionData?.user?.email);
  }

  console.log('=== Email login (priya) ===');
  console.log(`login POST status: ${loginRes.status}`);
  console.log(`session cookie issued: ${sessionCookie ? 'yes' : 'no'}`);
  if (sessionData) {
    console.log(`session user: ${sessionData?.user?.email ?? '(none)'}`);
    console.log(`session name: ${sessionData?.user?.name ?? '(none)'}`);
  }
  console.log(`verdict: ${sessionOk ? 'PASS — logged in via Supabase Auth' : 'FAIL — no session'}`);
  return sessionOk;
}

// ---------- main ----------
const results = [];
results.push(await checkOauthStart());
results.push(await checkEmailLogin('priya.sharma.in@gmail.com', 'PriyaTest123!'));

console.log('\n=========================');
console.log(
  results.every(Boolean)
    ? 'ALL CHECKS PASSED ✔'
    : 'SOME CHECKS FAILED ✘ (see above)'
);
