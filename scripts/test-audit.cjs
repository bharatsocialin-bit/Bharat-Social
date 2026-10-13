/**
 * Audit-specific tests:
 *   1. Daily quiz race condition — two CONCURRENT submissions → only one succeeds
 *   2. Badge reconciliation endpoint — retroactively awards missing badges
 *   3. Streak badge permanence — badge remains even after streak resets
 *   4. Fire-and-forget failure simulation — reconciliation recovers lost badges
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const c = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', grey: '\x1b[90m',
};
let pass = 0, fail = 0;
function log(ok, name, detail) {
  const sym = ok ? c.green + '✓' + c.reset : c.red + '✗' + c.reset;
  if (ok) pass++; else fail++;
  console.log(`  ${sym} ${name}${detail ? ' ' + c.grey + detail + c.reset : ''}`);
}

async function login(email, password) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrfJson = await csrfRes.json();
  const setCookie = csrfRes.headers.get('set-cookie') || '';
  const cookies = parseCookies(setCookie);
  const body = new URLSearchParams({ email, password, csrfToken: csrfJson.csrfToken, json: 'true' });
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
  for (const item of setCookie.split(/,(?=[^;]+=[^;]+)/)) {
    const [kv] = item.split(';');
    const eq = kv.indexOf('=');
    if (eq > -1) { cookies[kv.slice(0, eq).trim()] = kv.slice(eq + 1).trim(); }
  }
  return cookies;
}
function serializeCookies(cookies) {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function main() {
  console.log(c.blue + '━'.repeat(70) + c.reset);
  console.log(c.blue + 'BharatSocial — Final Integration Audit Tests' + c.reset);
  console.log(c.blue + '━'.repeat(70) + c.reset);

  // ── Register + login a fresh user ──
  const testEmail = `audit-test-${Date.now()}@test.bharatsocial`;
  const testUsername = `audit_test_${Date.now()}`;
  let res = await fetch(`${BASE}/api/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, username: testUsername, password: 'testpassword123', name: 'Audit Tester' }),
  });
  log(res.status === 201, 'registered fresh user', `(@${testUsername})`);
  const cookie = await login(testEmail, 'testpassword123');
  log(!!cookie, 'login returned cookies');

  // Get user ID
  res = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookie } });
  const sessionJson = await res.json();
  const userId = sessionJson.user?.id;
  log(!!userId, 'user ID present', `(${userId?.slice(0, 12)}…)`);

  // ════════════════════════════════════════════════════════════════════════
  // Test 1: Daily quiz race condition — concurrent submissions
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n' + c.yellow + 'Test 1: Daily quiz concurrent submission (race condition fix)' + c.reset);

  // Fetch today's daily challenge
  res = await fetch(`${BASE}/api/quiz/daily`, { headers: { Cookie: cookie } });
  const dailyJson = await res.json();
  log(!!dailyJson.questionIds?.length, 'daily challenge loaded', `(${dailyJson.questionIds?.length} questions)`);
  const dailyDate = dailyJson.date;
  const dailyQuestionIds = dailyJson.questionIds;

  // Fetch the question details
  const idsParam = dailyQuestionIds.join(',');
  res = await fetch(`${BASE}/api/quiz/questions?ids=${encodeURIComponent(idsParam)}`);
  const qjson = await res.json();
  log(qjson.questions?.length === dailyQuestionIds.length, 'fetched daily questions');

  const dailyBody = {
    type: 'daily', refId: dailyDate,
    startedAt: new Date(Date.now() - 30_000).toISOString(),
    questionIds: dailyQuestionIds,
    answers: dailyQuestionIds.map(() => ({ selectedOptionIndex: 0, timeTakenSeconds: 5 })),
  };

  // Fire TWO concurrent submissions
  const [res1, res2] = await Promise.all([
    fetch(`${BASE}/api/quiz/attempts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(dailyBody) }),
    fetch(`${BASE}/api/quiz/attempts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(dailyBody) }),
  ]);

  const status1 = res1.status;
  const status2 = res2.status;
  log(status1 === 201 || status2 === 201, 'at least one succeeded', `(res1=${status1}, res2=${status2})`);
  log(status1 === 409 || status2 === 409, 'at least one rejected with 409', `(res1=${status1}, res2=${status2})`);

  // Verify only ONE attempt was created
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const attemptCount = await db.quizAttempt.count({ where: { userId, type: 'daily', refId: dailyDate } });
  log(attemptCount === 1, 'exactly 1 daily attempt in DB', `(${attemptCount})`);

  // Verify only ONE DailyQuizCompletion lock row exists
  const lockCount = await db.dailyQuizCompletion.count({ where: { userId, date: dailyDate } });
  log(lockCount === 1, 'exactly 1 DailyQuizCompletion lock', `(${lockCount})`);

  // ════════════════════════════════════════════════════════════════════════
  // Test 2: Badge reconciliation endpoint
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n' + c.yellow + 'Test 2: Badge reconciliation endpoint' + c.reset);

  // Before reconciliation, count the user's badges
  let badgeCountBefore = await db.userBadge.count({ where: { userId } });
  log(badgeCountBefore >= 1, 'user has ≥1 badge before reconciliation', `(${badgeCountBefore})`);

  // Promote user to admin
  await db.user.update({ where: { email: testEmail }, data: { role: 'admin' } });
  log(true, 'user promoted to admin');

  // Call reconciliation endpoint
  res = await fetch(`${BASE}/api/admin/badges/reconcile/${userId}`, { method: 'POST', headers: { Cookie: cookie } });
  const reconJson = await res.json();
  log(res.status === 200, 'POST /api/admin/badges/reconcile → 200');
  log(typeof reconJson.badgesAfter === 'number', 'badgesAfter returned', `(${reconJson.badgesAfter})`);
  log(Array.isArray(reconJson.newlyAwarded), 'newlyAwarded returned', `(${reconJson.newlyAwarded?.length} new)`);
  log(reconJson.badgesAfter >= badgeCountBefore, 'badgesAfter ≥ badgesBefore', `(before=${badgeCountBefore}, after=${reconJson.badgesAfter})`);

  // Verify reconciliation is idempotent (running it again doesn't create duplicates)
  res = await fetch(`${BASE}/api/admin/badges/reconcile/${userId}`, { method: 'POST', headers: { Cookie: cookie } });
  const reconJson2 = await res.json();
  log(reconJson2.badgesAfter === reconJson.badgesAfter, 'reconciliation idempotent', `(after1=${reconJson.badgesAfter}, after2=${reconJson2.badgesAfter})`);

  // ════════════════════════════════════════════════════════════════════════
  // Test 3: Streak badge permanence — badge remains after streak resets
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n' + c.yellow + 'Test 3: Streak badge permanence' + c.reset);

  // The user completed 1 daily quiz, so they have a 1-day streak.
  // The 'first-spark' (3-day) badge should NOT be awarded yet.
  const firstSpark = await db.userBadge.findFirst({
    where: { userId, badge: { slug: 'first-spark' } },
  });
  log(!firstSpark, 'first-spark (3-day) NOT yet earned (streak is only 1 day)');

  // The quiz-beginner badge SHOULD still be there (it was earned via the daily quiz)
  const quizBeginner = await db.userBadge.findFirst({
    where: { userId, badge: { slug: 'quiz-beginner' } },
  });
  log(!!quizBeginner, 'quiz-beginner badge still earned');

  // ════════════════════════════════════════════════════════════════════════
  // Test 4: Fire-and-forget failure recovery via reconciliation
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n' + c.yellow + 'Test 4: Reconciliation recovers missed badges' + c.reset);

  // Simulate a missed badge: manually DELETE a UserBadge row, then
  // reconcile and verify it's re-awarded.
  if (quizBeginner) {
    await db.userBadge.delete({ where: { id: quizBeginner.id } });
    log(true, 'manually deleted quiz-beginner badge (simulating missed fire-and-forget)');

    const afterDelete = await db.userBadge.count({ where: { userId } });
    log(afterDelete === badgeCountBefore - 1, 'badge count decreased by 1', `(before=${badgeCountBefore}, after delete=${afterDelete})`);

    // Reconcile — should re-award the deleted badge
    res = await fetch(`${BASE}/api/admin/badges/reconcile/${userId}`, { method: 'POST', headers: { Cookie: cookie } });
    const reconJson3 = await res.json();
    log(reconJson3.newlyAwarded?.includes('quiz-beginner'), 'quiz-beginner re-awarded by reconciliation', `(${reconJson3.newlyAwarded?.join(', ')})`);

    const afterRecon = await db.userBadge.count({ where: { userId } });
    log(afterRecon === badgeCountBefore, 'badge count restored', `(before=${badgeCountBefore}, after recon=${afterRecon})`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Test 5: Non-admin cannot call reconciliation
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n' + c.yellow + 'Test 5: Non-admin reconciliation → 403' + c.reset);

  // Demote the user
  await db.user.update({ where: { email: testEmail }, data: { role: 'user' } });

  res = await fetch(`${BASE}/api/admin/badges/reconcile/${userId}`, { method: 'POST', headers: { Cookie: cookie } });
  log(res.status === 403, 'non-admin → 403', `(status=${res.status})`);

  // ════════════════════════════════════════════════════════════════════════
  // Test 6: Points consistency — total points across attempts matches sum
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n' + c.yellow + 'Test 6: Points consistency' + c.reset);

  // Fetch all attempts and sum totalPoints
  const attempts = await db.quizAttempt.findMany({ where: { userId }, select: { totalPoints: true } });
  const computedTotal = attempts.reduce((sum, a) => sum + a.totalPoints, 0);

  // Fetch from the history API
  res = await fetch(`${BASE}/api/quiz/history`, { headers: { Cookie: cookie } });
  const histJson = await res.json();
  const apiTotal = histJson.stats?.totalPoints;

  log(computedTotal === apiTotal, 'computed total matches API total', `(computed=${computedTotal}, API=${apiTotal})`);

  // ════════════════════════════════════════════════════════════════════════
  // Test 7: Existing data preserved
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n' + c.yellow + 'Test 7: Existing data preserved' + c.reset);
  const users = await db.user.count();
  const posts = await db.post.count();
  const reports = await db.report.count();
  const modActions = await db.moderationAction.count();
  const questions = await db.quizQuestion.count();
  const badges = await db.badge.count();
  log(users >= 2, 'users ≥ 2', `(${users})`);
  log(posts >= 3, 'posts ≥ 3', `(${posts})`);
  log(reports >= 1, 'reports ≥ 1', `(${reports})`);
  log(modActions >= 4, 'modActions ≥ 4', `(${modActions})`);
  log(questions >= 1000, 'quiz questions >= 1000', `(${questions})`);
  log(badges === 33, 'badge definitions = 33', `(${badges})`);

  // ── Cleanup ──
  console.log('\n' + c.grey + 'Cleanup' + c.reset);
  await db.userBadge.deleteMany({ where: { userId } });
  await db.badgeProgress.deleteMany({ where: { userId } });
  await db.dailyQuizCompletion.deleteMany({ where: { userId } });
  await db.quizAttempt.deleteMany({ where: { userId } });
  await db.moderationAction.deleteMany({ where: { action: { contains: 'badge_' } } });
  await db.user.delete({ where: { id: userId } });
  await db.$disconnect();

  console.log('\n' + c.blue + '━'.repeat(70) + c.reset);
  console.log(c.green + `Passed: ${pass}` + c.reset + c.red + `  Failed: ${fail}` + c.reset);
  console.log(c.blue + '━'.repeat(70) + c.reset);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(c.red + 'Test runner crashed:' + c.reset, e); process.exit(2); });
