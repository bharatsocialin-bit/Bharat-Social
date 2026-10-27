/**
 * Register a fresh test user with known password, then immediately log in.
 * If login succeeds -> "Confirm email" is OFF and the full Supabase email path works.
 * If login fails with "Email not confirmed" -> the toggle is still ON.
 */
const BASE = 'http://localhost:3000';
const EMAIL = `verify.z.${Date.now()}@gmail.com`;
const PASSWORD = 'VerifyZ123!';
const USERNAME = `verifyz${Math.floor(Math.random() * 900 + 100)}`;

async function main() {
  // ---- Step 1: register via Supabase-backed /api/register ----
  const regRes = await fetch(`${BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, username: USERNAME, name: 'Verify Z' }),
  });
  const reg = await regRes.json();
  console.log('=== Register ===');
  console.log(`status: ${regRes.status}`);
  console.log(`response: ${JSON.stringify(reg).slice(0, 300)}`);

  if (regRes.status !== 200 && regRes.status !== 201) {
    console.log('\nverdict: FAIL at registration');
    return;
  }
  if (reg.emailConfirmationRequired) {
    console.log('\n⚠ "Confirm email" is STILL ON in Supabase dashboard!');
  }

  // ---- Step 2: login via NextAuth credentials (Supabase signInWithPassword path) ----
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const cookieJar = csrfRes.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieJar,
    },
    body: new URLSearchParams({ email: EMAIL, password: PASSWORD, csrfToken, json: 'true' }).toString(),
    redirect: 'manual',
  });

  const loginCookies = loginRes.headers.getSetCookie();
  const hasSession = loginCookies.some((c) => c.includes('next-auth.session-token'));
  const allCookies = [...cookieJar.split('; '), ...loginCookies.map((c) => c.split(';')[0])]
    .filter(Boolean)
    .join('; ');

  let sessionUser = null;
  if (hasSession) {
    const sessRes = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: allCookies } });
    const sess = await sessRes.json();
    sessionUser = sess?.user?.email ?? null;
  }

  console.log('\n=== Login ===');
  console.log(`login POST status: ${loginRes.status}`);
  console.log(`session cookie issued: ${hasSession ? 'yes' : 'no'}`);
  console.log(`session user: ${sessionUser ?? '(none)'}`);

  console.log('\n=========================');
  if (sessionUser) {
    console.log('EMAIL AUTH FULLY WORKING ✔ (Confirm email is OFF, Supabase password path verified)');
  } else {
    console.log('EMAIL LOGIN FAILED ✘');
    // Try to extract error message from the NextAuth response body
    try {
      const errBody = await loginRes.text();
      console.log('login response body:', errBody.slice(0, 300));
    } catch {}
  }
}

main().catch((e) => {
  console.error('script error:', e);
  process.exit(1);
});
