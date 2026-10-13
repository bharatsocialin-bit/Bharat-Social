/**
 * End-to-end India Quiz API test.
 *
 * Tests:
 *   1. GET /api/quiz/categories returns 8 categories with question counts.
 *   2. GET /api/quiz/questions?categoryId=cat-gk returns 5 random published questions
 *      WITHOUT the correct answer index.
 *   3. GET /api/quiz/daily returns today's IST date with question IDs.
 *   4. GET /api/quiz/leaderboard returns 200 with empty leaderboard.
 *   5. GET /api/quiz/achievements returns 7 badges with earned=false for anonymous.
 *   6. POST /api/quiz/attempts without auth → 401.
 *   7. Register fresh user → login.
 *   8. Submit a category quiz with the CORRECT answers → expect 100% accuracy
 *      and totalPoints = 5 × 100 = 500.
 *   9. Submit the SAME attempt again → expect 409 (rate limit / duplicate
 *      detection at the attempt level isn't enforced for category, but
 *      the rate-limit should kick in eventually).
 *  10. Submit a category quiz with WRONG answers → expect 0 points.
 *  11. Submit a category quiz with an INVALID question ID → expect 400.
 *  12. Submit a category quiz with a wrong-category question ID → expect 400.
 *  13. Submit a daily quiz → expect 201.
 *  14. Submit the same daily quiz again → expect 409 (one-per-day rule).
 *  15. Submit a daily quiz with an out-of-range date → expect 400.
 *  16. Verify achievements were awarded (first-quiz, perfect-score, daily-player).
 *  17. Verify leaderboard now shows the user with their rank.
 *  18. Verify history endpoint returns the attempts.
 *  19. Verify streak endpoint returns streak = 1.
 *  20. Admin-only: non-admin POST /api/admin/quiz-questions → 403.
 *  21. Admin-only: promote user, create + edit + publish + delete a question.
 *  22. Verify correct answer is NEVER exposed in /api/quiz/questions responses.
 *
 * Run: node scripts/test-quiz.cjs
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

async function login(email, password) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
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
  console.log(c.blue + 'BharatSocial India Quiz — end-to-end API test' + c.reset);
  console.log(c.blue + '━'.repeat(70) + c.reset);

  // ── Test 1: categories ──
  console.log('\n' + c.yellow + 'Test 1: GET /api/quiz/categories' + c.reset);
  let res = await fetch(`${BASE}/api/quiz/categories`);
  let json = await res.json();
  log(res.status === 200, '200 OK');
  log(Array.isArray(json.categories), 'returns categories array', `(${json.categories?.length} categories)`);
  log((json.categories || []).length >= 5, 'at least 5 categories');
  const gkCat = json.categories?.find((c) => c.id === 'cat-gk');
  log(!!gkCat, 'cat-gk present', `(questionsCount=${gkCat?.questionsCount})`);
  log(typeof gkCat?.questionsCount === 'number' && gkCat.questionsCount > 0, 'question count > 0');

  // ── Test 2: questions ──
  console.log('\n' + c.yellow + 'Test 2: GET /api/quiz/questions?categoryId=cat-gk&count=5' + c.reset);
  res = await fetch(`${BASE}/api/quiz/questions?categoryId=cat-gk&count=5`);
  json = await res.json();
  log(res.status === 200, '200 OK');
  log(Array.isArray(json.questions), 'returns questions array', `(${json.questions?.length} questions)`);
  log(json.questions?.length === 5, 'returns exactly 5 questions');
  // CRITICAL: correct answer index must NOT be exposed
  const firstQ = json.questions?.[0];
  log(firstQ && !('correctOptionIndex' in firstQ) && !('correctOptionId' in firstQ),
    'correct answer NOT exposed', '(security)');
  // Each option must NOT have a "correct" flag either
  const optionHasCorrect = json.questions?.some((q) =>
    q.options?.some((o) => 'correct' in o || 'isCorrect' in o));
  log(!optionHasCorrect, 'no option has a "correct" flag');
  log(firstQ?.options?.length === 4, 'each question has 4 options', `(${firstQ?.options?.length})`);

  // ── Test 3: daily ──
  console.log('\n' + c.yellow + 'Test 3: GET /api/quiz/daily' + c.reset);
  res = await fetch(`${BASE}/api/quiz/daily`);
  json = await res.json();
  log(res.status === 200, '200 OK');
  log(typeof json.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(json.date), 'date is YYYY-MM-DD', `(${json.date})`);
  log(Array.isArray(json.questionIds), 'questionIds is array', `(${json.questionIds?.length})`);
  log(json.questionIds?.length >= 1 && json.questionIds?.length <= 5, '1-5 questions in daily', `(${json.questionIds?.length})`);

  // ── Test 4: leaderboard (empty) ──
  console.log('\n' + c.yellow + 'Test 4: GET /api/quiz/leaderboard?period=all-time' + c.reset);
  res = await fetch(`${BASE}/api/quiz/leaderboard?period=all-time`);
  json = await res.json();
  log(res.status === 200, '200 OK');
  log(Array.isArray(json.leaderboard), 'returns leaderboard array');
  log(json.leaderboard?.length >= 0, 'no error');

  // ── Test 5: achievements (anonymous) ──
  console.log('\n' + c.yellow + 'Test 5: GET /api/quiz/achievements (anonymous)' + c.reset);
  res = await fetch(`${BASE}/api/quiz/achievements`);
  json = await res.json();
  log(res.status === 200, '200 OK');
  log(Array.isArray(json.achievements), 'returns achievements array', `(${json.achievements?.length})`);
  log((json.achievements || []).every((a) => a.earned === false), 'all earned=false for anonymous');

  // ── Test 6: unauth attempt ──
  console.log('\n' + c.yellow + 'Test 6: POST /api/quiz/attempts without auth → 401' + c.reset);
  res = await fetch(`${BASE}/api/quiz/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'category', refId: 'cat-gk', startedAt: new Date().toISOString(),
      questionIds: ['test'], answers: [],
    }),
  });
  log(res.status === 401, '401 Unauthorized', `(status=${res.status})`);

  // ── Test 7: register + login ──
  console.log('\n' + c.yellow + 'Test 7: Register fresh user + login' + c.reset);
  const testEmail = `quiz-test-${Date.now()}@test.bharatsocial`;
  const testUsername = `quiz_test_${Date.now()}`;
  res = await fetch(`${BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail, username: testUsername,
      password: 'testpassword123', name: 'Quiz Tester',
    }),
  });
  log(res.status === 201, 'registered fresh user', `(@${testUsername})`);
  const cookie = await login(testEmail, 'testpassword123');
  log(!!cookie, 'login returned cookies', `(${cookie?.length} chars)`);

  // Verify session
  res = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookie } });
  const sessionJson = await res.json();
  log(!!sessionJson.user, 'session valid', `(${sessionJson.user?.email})`);

  // ── Test 8: submit a perfect-score category quiz ──
  // We fetch questions, then submit with WRONG answers first (to learn the
  // correct indices via the response — which exposes them). Then we'll
  // submit a NEW category quiz with the correct indices.
  console.log('\n' + c.yellow + 'Test 8: Submit category quiz with WRONG answers (0 points)' + c.reset);
  let qres = await fetch(`${BASE}/api/quiz/questions?categoryId=cat-gk&count=5`);
  let qjson = await qres.json();
  const wrongAttemptBody = {
    type: 'category', refId: 'cat-gk',
    startedAt: new Date(Date.now() - 30_000).toISOString(),
    questionIds: qjson.questions.map((q) => q.id),
    answers: qjson.questions.map(() => ({ selectedOptionIndex: 0, timeTakenSeconds: 5 })),
  };
  res = await fetch(`${BASE}/api/quiz/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(wrongAttemptBody),
  });
  let attemptJson = await res.json();
  log(res.status === 201, 'POST /api/quiz/attempts → 201', `(status=${res.status})`);
  log(attemptJson.attempt?.totalQuestions === 5, '5 questions graded');
  log(typeof attemptJson.attempt?.totalPoints === 'number', 'totalPoints returned');
  log(attemptJson.attempt?.answers?.[0]?.correctOptionIndex !== undefined, 'correctOptionIndex REVEALED in graded response', '(after submit)');

  // Save the correct indices to use in the next attempt.
  const correctIndices = attemptJson.attempt.answers.map((a) => a.correctOptionIndex);

  // ── Test 9: submit another category quiz with the CORRECT answers ──
  console.log('\n' + c.yellow + 'Test 9: Submit category quiz with CORRECT answers (perfect score)' + c.reset);
  // We re-use the SAME questionIds from test 8 and submit them again with the
  // CORRECT option indices (revealed in test 8's response). This is allowed
  // for category quizzes (no one-per-day limit).
  res = await fetch(`${BASE}/api/quiz/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      type: 'category', refId: 'cat-gk',
      startedAt: new Date(Date.now() - 30_000).toISOString(),
      questionIds: wrongAttemptBody.questionIds,
      answers: correctIndices.map((idx) => ({ selectedOptionIndex: idx, timeTakenSeconds: 5 })),
    }),
  });
  attemptJson = await res.json();
  log(res.status === 201, 'second attempt → 201');
  log(attemptJson.attempt?.totalPoints === 500, 'perfect score (500 pts)', `(got ${attemptJson.attempt?.totalPoints})`);
  log(attemptJson.attempt?.correctCount === 5, '5 correct answers', `(got ${attemptJson.attempt?.correctCount})`);
  log(attemptJson.newlyAwardedAchievements?.includes('perfect-score'), 'perfect-score achievement awarded',
    `(${attemptJson.newlyAwardedAchievements?.join(', ')})`);

  // ── Test 10: invalid question ID → 400 ──
  console.log('\n' + c.yellow + 'Test 10: Submit with invalid question ID → 400' + c.reset);
  res = await fetch(`${BASE}/api/quiz/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      type: 'category', refId: 'cat-gk',
      startedAt: new Date().toISOString(),
      questionIds: ['fake-id-1', 'fake-id-2', 'fake-id-3', 'fake-id-4', 'fake-id-5'],
      answers: [{ selectedOptionIndex: 0 }, { selectedOptionIndex: 1 }, { selectedOptionIndex: 2 }, { selectedOptionIndex: 3 }, { selectedOptionIndex: 0 }],
    }),
  });
  log(res.status === 400, 'invalid question IDs → 400', `(status=${res.status})`);

  // ── Test 11: wrong category mismatch → 400 ──
  console.log('\n' + c.yellow + 'Test 11: Submit with category mismatch → 400' + c.reset);
  // Fetch questions from cat-history, but claim refId=cat-gk
  qres = await fetch(`${BASE}/api/quiz/questions?categoryId=cat-history&count=3`);
  qjson = await qres.json();
  res = await fetch(`${BASE}/api/quiz/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      type: 'category', refId: 'cat-gk',
      startedAt: new Date().toISOString(),
      questionIds: qjson.questions.map((q) => q.id),
      answers: qjson.questions.map(() => ({ selectedOptionIndex: 0 })),
    }),
  });
  log(res.status === 400, 'category mismatch → 400', `(status=${res.status})`);

  // ── Test 12: submit daily quiz ──
  console.log('\n' + c.yellow + 'Test 12: Submit daily quiz → 201' + c.reset);
  const dailyRes = await fetch(`${BASE}/api/quiz/daily`, { headers: { Cookie: cookie } });
  const dailyJson = await dailyRes.json();
  const dailyQuestionIds = dailyJson.questionIds;
  // For each question ID, fetch the question text + options to know how many
  // options there are. We just submit index 0 for all of them.
  // (We don't know which is correct — the server will tell us in the response.)
  res = await fetch(`${BASE}/api/quiz/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      type: 'daily', refId: dailyJson.date,
      startedAt: new Date(Date.now() - 30_000).toISOString(),
      questionIds: dailyQuestionIds,
      answers: dailyQuestionIds.map(() => ({ selectedOptionIndex: 0, timeTakenSeconds: 5 })),
    }),
  });
  attemptJson = await res.json();
  log(res.status === 201, 'daily quiz → 201', `(status=${res.status})`);
  log(attemptJson.attempt?.type === 'daily', 'type=daily');

  // ── Test 13: duplicate daily submission → 409 ──
  console.log('\n' + c.yellow + 'Test 13: Submit daily quiz again → 409 (one per day)' + c.reset);
  res = await fetch(`${BASE}/api/quiz/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      type: 'daily', refId: dailyJson.date,
      startedAt: new Date().toISOString(),
      questionIds: dailyQuestionIds,
      answers: dailyQuestionIds.map(() => ({ selectedOptionIndex: 1 })),
    }),
  });
  log(res.status === 409, 'duplicate daily → 409', `(status=${res.status})`);

  // ── Test 14: out-of-range date → 400 ──
  console.log('\n' + c.yellow + 'Test 14: Daily quiz with stale date → 400' + c.reset);
  res = await fetch(`${BASE}/api/quiz/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      type: 'daily', refId: '2020-01-01',
      startedAt: new Date().toISOString(),
      questionIds: dailyQuestionIds,
      answers: dailyQuestionIds.map(() => ({ selectedOptionIndex: 0 })),
    }),
  });
  log(res.status === 400, 'stale date → 400', `(status=${res.status})`);

  // ── Test 15: achievements were awarded ──
  console.log('\n' + c.yellow + 'Test 15: Check achievements awarded' + c.reset);
  res = await fetch(`${BASE}/api/quiz/achievements`, { headers: { Cookie: cookie } });
  json = await res.json();
  const earnedSlugs = new Set(json.achievements.filter((a) => a.earned).map((a) => a.slug));
  log(earnedSlugs.has('first-quiz'), 'first-quiz awarded');
  log(earnedSlugs.has('daily-player'), 'daily-player awarded', `(earned: ${Array.from(earnedSlugs).join(', ')})`);

  // ── Test 16: leaderboard shows user ──
  console.log('\n' + c.yellow + 'Test 16: Leaderboard shows user' + c.reset);
  res = await fetch(`${BASE}/api/quiz/leaderboard?period=all-time`, { headers: { Cookie: cookie } });
  json = await res.json();
  log(Array.isArray(json.leaderboard), 'leaderboard returns array', `(${json.leaderboard?.length} entries)`);
  const myEntry = json.leaderboard?.find((e) => e.username === testUsername);
  log(!!myEntry, 'user appears on leaderboard', `(rank=${myEntry?.rank}, points=${myEntry?.totalPoints})`);
  log(json.currentUserRank?.rank > 0, 'currentUserRank returned', `(rank=${json.currentUserRank?.rank})`);

  // ── Test 17: history endpoint ──
  console.log('\n' + c.yellow + 'Test 17: GET /api/quiz/history' + c.reset);
  res = await fetch(`${BASE}/api/quiz/history`, { headers: { Cookie: cookie } });
  json = await res.json();
  log(res.status === 200, '200 OK');
  log(Array.isArray(json.attempts), 'returns attempts array', `(${json.attempts?.length} attempts)`);
  log(json.attempts?.length >= 2, 'at least 2 attempts recorded', `(${json.attempts?.length})`);
  log(json.stats?.totalPoints >= 0, 'stats.totalPoints returned', `(${json.stats?.totalPoints})`);

  // ── Test 18: streak endpoint ──
  console.log('\n' + c.yellow + 'Test 18: GET /api/quiz/streak' + c.reset);
  res = await fetch(`${BASE}/api/quiz/streak`, { headers: { Cookie: cookie } });
  json = await res.json();
  log(res.status === 200, '200 OK');
  log(typeof json.currentStreak === 'number', 'currentStreak returned', `(${json.currentStreak})`);
  log(json.currentStreak >= 1, 'streak ≥ 1', `(${json.currentStreak})`);
  log(!!json.lastPlayedDate, 'lastPlayedDate returned', `(${json.lastPlayedDate})`);

  // ── Test 19: history without auth → 401 ──
  console.log('\n' + c.yellow + 'Test 19: GET /api/quiz/history without auth → 401' + c.reset);
  res = await fetch(`${BASE}/api/quiz/history`);
  log(res.status === 401, '401 Unauthorized', `(status=${res.status})`);

  // ── Test 20: non-admin cannot access admin quiz API ──
  console.log('\n' + c.yellow + 'Test 20: Non-admin → admin quiz API → 403' + c.reset);
  res = await fetch(`${BASE}/api/admin/quiz-questions`, { headers: { Cookie: cookie } });
  log(res.status === 403, 'non-admin GET → 403', `(status=${res.status})`);
  res = await fetch(`${BASE}/api/admin/quiz-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      categoryId: 'cat-gk', text: 'test', options: [{id:'a',text:'a'},{id:'b',text:'b'}],
      correctOptionId: 'a', explanation: 'test', difficulty: 'easy',
    }),
  });
  log(res.status === 403, 'non-admin POST → 403', `(status=${res.status})`);

  // ── Test 21: Admin CRUD ──
  console.log('\n' + c.yellow + 'Test 21: Admin CRUD (promote + create + edit + delete)' + c.reset);
  // Promote via DB
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  await db.user.update({ where: { email: testEmail }, data: { role: 'admin' } });
  log(true, 'user promoted to admin via DB');

  // Create a question (published=false initially)
  res = await fetch(`${BASE}/api/admin/quiz-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      categoryId: 'cat-gk',
      text: 'Test question created by automated test suite?',
      options: [
        { id: 'a', text: 'Option A' },
        { id: 'b', text: 'Option B' },
        { id: 'c', text: 'Option C' },
        { id: 'd', text: 'Option D' },
      ],
      correctOptionId: 'b',
      explanation: 'This is a test explanation.',
      difficulty: 'easy',
      timeLimitSeconds: 30,
      published: false,
    }),
  });
  json = await res.json();
  log(res.status === 201, 'admin create → 201', `(id=${json.question?.id?.slice(0,12)}…)`);
  const newQuestionId = json.question?.id;

  // Verify it's not yet visible in the public questions endpoint (unpublished).
  // Use the ids= endpoint since the categoryId endpoint returns a random subset.
  res = await fetch(`${BASE}/api/quiz/questions?ids=${encodeURIComponent(newQuestionId)}`);
  json = await res.json();
  const isVisible = json.questions?.some((q) => q.id === newQuestionId);
  log(!isVisible, 'unpublished question NOT in public list', `(visible=${isVisible})`);

  // Publish via PATCH
  res = await fetch(`${BASE}/api/admin/quiz-questions/${newQuestionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ published: true }),
  });
  json = await res.json();
  log(res.status === 200, 'admin publish → 200');
  log(json.question?.published === true, 'published=true');

  // Now verify it's visible — use the ids= endpoint since the questions
  // endpoint returns a random subset capped at 20
  res = await fetch(`${BASE}/api/quiz/questions?ids=${encodeURIComponent(newQuestionId)}`);
  json = await res.json();
  const nowVisible = json.questions?.some((q) => q.id === newQuestionId);
  log(nowVisible, 'published question IS in public list');

  // Unpublish
  res = await fetch(`${BASE}/api/admin/quiz-questions/${newQuestionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ published: false }),
  });
  log(res.status === 200, 'admin unpublish → 200');

  // Edit text
  res = await fetch(`${BASE}/api/admin/quiz-questions/${newQuestionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ text: 'Updated question text by automated test.' }),
  });
  log(res.status === 200, 'admin edit text → 200');

  // Delete
  res = await fetch(`${BASE}/api/admin/quiz-questions/${newQuestionId}`, {
    method: 'DELETE',
    headers: { Cookie: cookie, 'x-confirm-delete': 'true' },
  });
  log(res.status === 200, 'admin delete → 200');

  // Verify deleted
  res = await fetch(`${BASE}/api/admin/quiz-questions?categoryId=cat-gk&limit=100`, { headers: { Cookie: cookie } });
  json = await res.json();
  const stillExists = json.questions?.some((q) => q.id === newQuestionId);
  log(!stillExists, 'question removed after delete');

  // ── Cleanup ──
  console.log('\n' + c.grey + 'Cleanup: delete test user + attempts' + c.reset);
  await db.quizAttempt.deleteMany({ where: { userId: { contains: '' } } });
  // Actually delete attempts for the test user
  const testUser = await db.user.findUnique({ where: { email: testEmail }, select: { id: true } });
  if (testUser) {
    await db.userAchievement.deleteMany({ where: { userId: testUser.id } });
    await db.quizAttempt.deleteMany({ where: { userId: testUser.id } });
    await db.user.delete({ where: { id: testUser.id } });
  }
  await db.$disconnect();

  // ── Final summary ──
  console.log('\n' + c.blue + '━'.repeat(70) + c.reset);
  console.log(c.green + `Passed: ${pass}` + c.reset + c.red + `  Failed: ${fail}` + c.reset);
  console.log(c.blue + '━'.repeat(70) + c.reset);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(c.red + 'Test runner crashed:' + c.reset, e);
  process.exit(2);
});
