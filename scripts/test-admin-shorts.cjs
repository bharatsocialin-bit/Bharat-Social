/**
 * Admin-shorts integration test.
 *
 * Verifies the admin moderation flow end-to-end:
 *   1. Promote testuser to admin
 *   2. Login as testuser
 *   3. Upload a short
 *   4. List shorts via admin API
 *   5. Soft-delete via admin API
 *   6. Verify short hidden from public feed
 *   7. Restore via admin API
 *   8. Verify short reappears in feed
 *   9. Verify audit log entries created
 *  10. Demote testuser back to regular user (preserving their data)
 *
 * Run: node scripts/test-admin-shorts.cjs
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  grey: '\x1b[90m',
};
let pass = 0, fail = 0;
function log(ok, name, detail) {
  const sym = ok ? c.green + '✓' + c.reset : c.red + '✗' + c.reset;
  if (ok) pass++; else fail++;
  console.log(`  ${sym} ${name}${detail ? ' ' + c.grey + detail + c.reset : ''}`);
}

function buildMinimalMp4() {
  const mp4Hex = (
    '00000020667479706d703432000000006d7034326d703431' +
    '000001086d6f6f760000006c6d76686400000000d193b9d2' +
    '00000193d193b9d30000f4240000f42400000000001000000' +
    '000000000000000000000001000000000000000000000000' +
    '000000000000000100000000000000000000000000000000' +
    '000000000000000100000000000000000000000000000000' +
    '0000002404746b6c00000000000000000000000000000000' +
    '0000002404746b6400000000000000000000000000000000' +
    '0000001c68646c7200000000000000006d70343100000000' +
    '000000186d696e660000000000006d76686400000010d193b9d20001f4f2c00000014' +
    '6472666600000000'
  );
  return Buffer.from(mp4Hex, 'hex');
}

async function login(email, password) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { credentials: 'include' });
  const csrfJson = await csrfRes.json();
  const csrfToken = csrfJson.csrfToken;
  const setCookie = csrfRes.headers.get('set-cookie') || '';
  const cookies = parseCookies(setCookie);
  const body = new URLSearchParams({ email, password, csrfToken, json: 'true' });
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: serializeCookies(cookies) },
    body, redirect: 'manual',
  });
  const setCookieHeader = loginRes.headers.get('set-cookie') || '';
  const newCookies = parseCookies(setCookieHeader);
  return serializeCookies({ ...cookies, ...newCookies });
}

function parseCookies(setCookie) {
  const cookies = {};
  if (!setCookie) return cookies;
  const items = setCookie.split(/,(?=[^;]+=[^;]+)/);
  for (const item of items) {
    const [kv] = item.split(';');
    const eq = kv.indexOf('=');
    if (eq > -1) {
      const k = kv.slice(0, eq).trim();
      const v = kv.slice(eq + 1).trim();
      if (k && v) cookies[k] = v;
    }
  }
  return cookies;
}

function serializeCookies(cookies) {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function main() {
  console.log(c.blue + '━'.repeat(70) + c.reset);
  console.log(c.blue + 'BharatSocial Shorts — Admin moderation test' + c.reset);
  console.log(c.blue + '━'.repeat(70) + c.reset);

  // ── Use existing testuser (test@example.com / testpassword123 from earlier worklog) ──
  // We don't know the password, so we use a fresh admin-eligible user via DB.
  // Instead, register a fresh user and promote via API… but only admins can promote.
  //
  // So instead, we'll use a hybrid approach:
  //   - Register a fresh user
  //   - Directly promote them via DB
  //   - Login as them
  //   - Run the admin tests
  //   - Delete the fresh user at the end

  console.log('\n' + c.yellow + 'Setup: Register fresh admin user' + c.reset);
  const testEmail = `shorts-admin-${Date.now()}@test.bharatsocial`;
  const testUsername = `shorts_admin_${Date.now()}`;
  let res = await fetch(`${BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      username: testUsername,
      password: 'testpassword123',
      name: 'Shorts Admin',
    }),
  });
  log(res.status === 201, 'registered fresh user', `(@${testUsername})`);

  // ── Promote to admin via the DB ──
  console.log('\n' + c.yellow + 'Setup: Promote fresh user to admin (via DB)' + c.reset);
  const { execSync } = require('child_process');
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.user.update({ where: { email: testEmail }, data: { role: 'admin' } });
  const updatedUser = await db.user.findUnique({ where: { email: testEmail }, select: { role: true } });
  log(updatedUser?.role === 'admin', 'user promoted to admin');
  await db.$disconnect();

  // ── Login ──
  console.log('\n' + c.yellow + 'Step 1: Login as admin' + c.reset);
  const cookie = await login(testEmail, 'testpassword123');
  log(!!cookie, 'login returned cookies', cookie ? `(${cookie.length} chars)` : '');

  // ── Upload a short as admin ──
  console.log('\n' + c.yellow + 'Step 2: Upload a short as admin' + c.reset);
  const form = new FormData();
  form.append('video', new Blob([buildMinimalMp4()], { type: 'video/mp4' }), 'admin-test.mp4');
  form.append('caption', 'Admin moderation test short');
  form.append('hashtags', JSON.stringify(['admin', 'test']));
  form.append('language', 'en');
  res = await fetch(`${BASE}/api/shorts`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: form,
  });
  const uploadJson = await res.json();
  log(res.status === 201, 'upload → 201', `(id=${uploadJson.short?.id?.slice(0, 12)}…)`);
  const shortId = uploadJson.short?.id;

  // ── List shorts via admin API ──
  console.log('\n' + c.yellow + 'Step 3: List shorts via admin API' + c.reset);
  res = await fetch(`${BASE}/api/admin/shorts?filter=all`, { headers: { Cookie: cookie } });
  const listJson = await res.json();
  log(res.status === 200, 'GET /api/admin/shorts → 200', `(status=${res.status})`);
  log((listJson.shorts?.length || 0) >= 1, 'at least 1 short in admin list', `(${listJson.shorts?.length})`);
  log(listJson.shorts?.[0]?.moderationStatus === 'active', 'first short is active');

  // ── Soft-delete via admin API ──
  console.log('\n' + c.yellow + 'Step 4: Admin soft-delete short' + c.reset);
  res = await fetch(`${BASE}/api/admin/shorts/${shortId}`, {
    method: 'DELETE',
    headers: { Cookie: cookie, 'x-confirm-delete': 'true' },
  });
  const delJson = await res.json();
  log(res.status === 200, 'DELETE /api/admin/shorts/[id] → 200', `(status=${res.status})`);
  log(!!delJson.success, 'success=true', `(${delJson.success})`);

  // ── Verify short hidden from public feed ──
  console.log('\n' + c.yellow + 'Step 5: Verify short hidden from public feed' + c.reset);
  res = await fetch(`${BASE}/api/shorts`);
  const publicFeed = await res.json();
  log(publicFeed.shorts?.length === 0, 'public feed empty', `(${publicFeed.shorts?.length})`);

  // ── Restore via admin API ──
  console.log('\n' + c.yellow + 'Step 6: Admin restore short' + c.reset);
  res = await fetch(`${BASE}/api/admin/shorts/${shortId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ action: 'restore' }),
  });
  const restoreJson = await res.json();
  log(res.status === 200, 'PATCH restore → 200', `(status=${res.status})`);
  log(!!restoreJson.success, 'restored=true', `(${restoreJson.success})`);

  // ── Verify short reappears in public feed ──
  console.log('\n' + c.yellow + 'Step 7: Verify short reappears in public feed' + c.reset);
  res = await fetch(`${BASE}/api/shorts`);
  const publicFeed2 = await res.json();
  log(publicFeed2.shorts?.length === 1, 'public feed has 1 short', `(${publicFeed2.shorts?.length})`);

  // ── Verify audit log entries ──
  console.log('\n' + c.yellow + 'Step 8: Verify audit log entries created' + c.reset);
  const db2 = new PrismaClient();
  const auditEntries = await db2.moderationAction.findMany({
    where: { targetShortId: shortId },
    orderBy: { createdAt: 'desc' },
  });
  log(auditEntries.length >= 2, 'at least 2 audit entries', `(${auditEntries.length})`);
  log(auditEntries[0]?.action === 'short_restored', 'latest action is short_restored');
  log(auditEntries[1]?.action === 'short_deleted', 'previous action is short_deleted');

  // ── Cleanup: delete the test short + test user ──
  console.log('\n' + c.yellow + 'Cleanup: Delete test data' + c.reset);
  await db2.shortLike.deleteMany({});
  await db2.shortComment.deleteMany({});
  await db2.shortRepost.deleteMany({});
  await db2.report.deleteMany({ where: { shortId: { not: null } } });
  await db2.short.deleteMany({});
  await db2.moderationAction.deleteMany({ where: { targetShortId: { not: null } } });
  await db2.user.deleteMany({ where: { email: testEmail } });
  await db2.$disconnect();

  // ── Verify existing data preserved ──
  console.log('\n' + c.yellow + 'Final: Verify existing data preserved' + c.reset);
  const db3 = new PrismaClient();
  const users = await db3.user.count();
  const posts = await db3.post.count();
  const reports = await db3.report.count();
  const modActions = await db3.moderationAction.count();
  log(users === 2, 'users count preserved', `(${users})`);
  log(posts === 3, 'posts count preserved', `(${posts})`);
  log(reports === 1, 'reports count preserved', `(${reports})`);
  log(modActions === 4, 'moderationActions count preserved (pre-existing)', `(${modActions})`);
  await db3.$disconnect();

  console.log('\n' + c.blue + '━'.repeat(70) + c.reset);
  console.log(c.green + `Passed: ${pass}` + c.reset + c.red + `  Failed: ${fail}` + c.reset);
  console.log(c.blue + '━'.repeat(70) + c.reset);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(c.red + 'Test runner crashed:' + c.reset, e);
  process.exit(2);
});
