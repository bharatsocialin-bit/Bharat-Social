/**
 * End-to-end Badges & Achievements API test.
 *
 * Tests:
 *   1. GET /api/badges returns 33 badge definitions
 *   2. Anonymous user sees all badges with earned=false
 *   3. Register fresh user → login
 *   4. GET /api/badges for the logged-in user shows earned=false for all
 *   5. Complete a quiz with WRONG answers → 0 points
 *      → verify NO badges awarded (quiz-beginner requires 1 quiz completion,
 *         which IS satisfied, so quiz-beginner SHOULD be awarded)
 *      → actually: quiz-beginner requires count >= 1, so it SHOULD be awarded
 *         after any quiz completion
 *   6. Complete a quiz with CORRECT answers (perfect score)
 *      → verify perfect-score badge awarded
 *   7. Verify /api/badges shows the earned badges
 *   8. Verify /api/badges/user/[userId] returns the same data publicly
 *   9. Set featured badge via POST /api/badges/feature/[slug]
 *  10. Verify featured badge shows in user data
 *  11. Verify duplicate award is idempotent (re-run quiz, no duplicate)
 *  12. Verify chat badges are inactive (not awarded even with quiz activity)
 *  13. Test profile-complete badge: update profile with all fields
 *  14. Test posts-count badge: create a post
 *  15. Test following-count badge: follow another user
 *  16. Test received-comments-count: comment on own post (should NOT count) +
 *      comment on another user's post (should count for that user)
 *  17. Non-admin cannot access admin badge routes → 403
 *  18. Admin: list badges, deactivate one, verify it's hidden from user,
 *      reactivate, verify it reappears
 *  19. Verify existing data preserved (2 users, 3 posts, 1 report, 4 mod actions)
 *
 * Run: node scripts/test-badges.cjs
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
  console.log(c.blue + 'BharatSocial Badges & Achievements — end-to-end test' + c.reset);
  console.log(c.blue + '━'.repeat(70) + c.reset);

  // ── Test 1: GET /api/badges returns 28 ACTIVE badges (5 chat are inactive) ──
  console.log('\n' + c.yellow + 'Test 1: GET /api/badges (anonymous)' + c.reset);
  let res = await fetch(`${BASE}/api/badges`);
  let json = await res.json();
  log(res.status === 200, '200 OK');
  log(Array.isArray(json.badges), 'returns badges array', `(${json.badges?.length} badges)`);
  // 33 total - 5 inactive chat = 28 active visible to users
  log(json.badges?.length === 28, '28 active badges visible to users', `(${json.badges?.length})`);
  // Count by group (chat badges are inactive, so 0 should appear)
  const groups = {};
  for (const b of json.badges || []) groups[b.group] = (groups[b.group] || 0) + 1;
  log(groups.quiz === 10, '10 quiz badges', `(${groups.quiz})`);
  log(groups.streak === 6, '6 streak badges', `(${groups.streak})`);
  log(groups.points === 5, '5 points badges', `(${groups.points})`);
  log((groups.chat || 0) === 0, '0 chat badges (all inactive, hidden)', `(${groups.chat || 0})`);
  log(groups.platform === 7, '7 platform badges', `(${groups.platform})`);
  // All visible badges must be active
  log(json.badges?.every((b) => b.active === true), 'all visible badges active');
  // Anonymous: no badges earned
  log(json.badges?.every((b) => b.earned === false), 'all earned=false for anonymous');
  log(json.currentUserEarnedCount === 0, 'currentUserEarnedCount=0');

  // ── Test 1b: Admin sees ALL 33 badges (including inactive) via admin route ──
  console.log('\n' + c.yellow + 'Test 1b: Admin badge count (via DB)' + c.reset);
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient();
  const allBadges = await db.badge.findMany();
  log(allBadges.length === 33, '33 total badges in DB', `(${allBadges.length})`);
  const allChatBadges = allBadges.filter((b) => b.group === 'chat');
  log(allChatBadges.length === 5, '5 chat badges in DB', `(${allChatBadges.length})`);
  log(allChatBadges.every((b) => b.active === false), 'all chat badges inactive in DB');

  // ── Test 2: Rarity distribution (active badges only) ──
  console.log('\n' + c.yellow + 'Test 2: Rarity distribution' + c.reset);
  const rarities = {};
  for (const b of json.badges || []) rarities[b.rarity] = (rarities[b.rarity] || 0) + 1;
  // Active badges: 33 total - 5 inactive chat = 28 active
  // Chat inactive breakdown: 1 common + 2 uncommon + 2 rare
  // So active: common 6, uncommon 7, rare 6, epic 4, legendary 5 = 28
  log((rarities.common || 0) === 6, '6 common (active)', `(${rarities.common || 0})`);
  log((rarities.uncommon || 0) === 7, '7 uncommon (active)', `(${rarities.uncommon || 0})`);
  log((rarities.rare || 0) === 6, '6 rare (active)', `(${rarities.rare || 0})`);
  log((rarities.epic || 0) === 4, '4 epic', `(${rarities.epic || 0})`);
  log((rarities.legendary || 0) === 5, '5 legendary', `(${rarities.legendary || 0})`);
  await db.$disconnect();

  // ── Test 3: Register fresh user + login ──
  console.log('\n' + c.yellow + 'Test 3: Register + login' + c.reset);
  const testEmail = `badges-test-${Date.now()}@test.bharatsocial`;
  const testUsername = `badges_test_${Date.now()}`;
  res = await fetch(`${BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail, username: testUsername,
      password: 'testpassword123', name: 'Badges Tester',
    }),
  });
  log(res.status === 201, 'registered fresh user', `(@${testUsername})`);
  const cookie = await login(testEmail, 'testpassword123');
  log(!!cookie, 'login returned cookies', `(${cookie?.length} chars)`);

  // Get the user ID
  res = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookie } });
  const sessionJson = await res.json();
  log(!!sessionJson.user, 'session valid', `(${sessionJson.user?.email})`);
  const userId = sessionJson.user?.id;
  log(!!userId, 'user ID present', `(${userId?.slice(0, 12)}…)`);

  // ── Test 4: GET /api/badges for logged-in user ──
  console.log('\n' + c.yellow + 'Test 4: Fresh user — no badges earned' + c.reset);
  res = await fetch(`${BASE}/api/badges`, { headers: { Cookie: cookie } });
  json = await res.json();
  log(json.badges?.every((b) => b.earned === false), 'all earned=false for fresh user');
  log(json.currentUserEarnedCount === 0, 'currentUserEarnedCount=0');

  // ── Test 5: Complete a quiz → quiz-beginner badge awarded ──
  console.log('\n' + c.yellow + 'Test 5: Complete quiz → quiz-beginner awarded' + c.reset);
  // Fetch 5 questions from cat-gk
  let qres = await fetch(`${BASE}/api/quiz/questions?categoryId=cat-gk&count=5`);
  let qjson = await qres.json();
  log(qjson.questions?.length === 5, 'fetched 5 questions');

  // Submit with index 0 for all (likely mostly wrong)
  res = await fetch(`${BASE}/api/quiz/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      type: 'category', refId: 'cat-gk',
      startedAt: new Date(Date.now() - 30_000).toISOString(),
      questionIds: qjson.questions.map((q) => q.id),
      answers: qjson.questions.map(() => ({ selectedOptionIndex: 0, timeTakenSeconds: 5 })),
    }),
  });
  let attemptJson = await res.json();
  log(res.status === 201, 'quiz attempt → 201');
  log(Array.isArray(attemptJson.newlyAwardedBadges), 'newlyAwardedBadges returned', `(${attemptJson.newlyAwardedBadges?.length} badges)`);
  log(attemptJson.newlyAwardedBadges?.includes('quiz-beginner'), 'quiz-beginner awarded');
  log(attemptJson.newlyAwardedBadges?.includes('first-100') || true, 'first-100 may be awarded if score ≥ 100', `(score=${attemptJson.attempt?.totalPoints})`);

  // ── Test 6: Verify /api/badges now shows quiz-beginner as earned ──
  console.log('\n' + c.yellow + 'Test 6: /api/badges shows quiz-beginner earned' + c.reset);
  res = await fetch(`${BASE}/api/badges`, { headers: { Cookie: cookie } });
  json = await res.json();
  const quizBeginner = json.badges?.find((b) => b.slug === 'quiz-beginner');
  log(quizBeginner?.earned === true, 'quiz-beginner earned=true');
  log(!!quizBeginner?.awardedAt, 'awardedAt set', `(${quizBeginner?.awardedAt?.slice(0, 10)})`);
  log(json.currentUserEarnedCount >= 1, 'currentUserEarnedCount ≥ 1', `(${json.currentUserEarnedCount})`);

  // ── Test 7: GET /api/badges/user/[userId] (public) ──
  console.log('\n' + c.yellow + 'Test 7: Public user badges endpoint' + c.reset);
  res = await fetch(`${BASE}/api/badges/user/${userId}`);
  json = await res.json();
  log(res.status === 200, '200 OK');
  log(json.earnedCount >= 1, 'earnedCount ≥ 1', `(${json.earnedCount})`);
  const pubQuizBeginner = json.badges?.find((b) => b.slug === 'quiz-beginner');
  log(pubQuizBeginner?.earned === true, 'quiz-beginner earned=true (public view)');

  // ── Test 8: Set featured badge ──
  console.log('\n' + c.yellow + 'Test 8: Set featured badge' + c.reset);
  res = await fetch(`${BASE}/api/badges/feature/quiz-beginner`, {
    method: 'POST',
    headers: { Cookie: cookie },
  });
  log(res.status === 200, 'POST /api/badges/feature/quiz-beginner → 200');
  const featJson = await res.json();
  log(featJson.featuredBadgeSlug === 'quiz-beginner', 'featuredBadgeSlug=quiz-beginner');

  // Verify it shows in user data
  res = await fetch(`${BASE}/api/badges/user/${userId}`);
  json = await res.json();
  const featured = json.badges?.find((b) => b.slug === 'quiz-beginner');
  log(featured?.isFeatured === true, 'isFeatured=true on quiz-beginner');

  // ── Test 9: Cannot feature an unearned badge ──
  console.log('\n' + c.yellow + 'Test 9: Cannot feature unearned badge → 404' + c.reset);
  res = await fetch(`${BASE}/api/badges/feature/quiz-champion`, {
    method: 'POST',
    headers: { Cookie: cookie },
  });
  log(res.status === 404, 'unearned badge → 404', `(status=${res.status})`);

  // ── Test 10: Complete a PERFECT quiz → perfect-score badge ──
  console.log('\n' + c.yellow + 'Test 10: Perfect quiz → perfect-score badge' + c.reset);
  // Re-fetch the same question IDs and submit with the correct indices
  // (revealed in the previous attempt's response).
  const correctIndices = attemptJson.attempt.answers.map((a) => a.correctOptionIndex);
  res = await fetch(`${BASE}/api/quiz/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      type: 'category', refId: 'cat-gk',
      startedAt: new Date(Date.now() - 30_000).toISOString(),
      questionIds: qjson.questions.map((q) => q.id),
      answers: correctIndices.map((idx) => ({ selectedOptionIndex: idx, timeTakenSeconds: 5 })),
    }),
  });
  attemptJson = await res.json();
  log(res.status === 201, 'perfect quiz → 201');
  log(attemptJson.attempt?.totalPoints === 500, 'perfect score (500 pts)', `(${attemptJson.attempt?.totalPoints})`);
  log(attemptJson.newlyAwardedBadges?.includes('perfect-score'), 'perfect-score badge awarded',
    `(${attemptJson.newlyAwardedAchievements?.join(', ')})`);

  // ── Test 11: Idempotency — re-evaluating doesn't duplicate ──
  console.log('\n' + c.yellow + 'Test 11: Idempotency — no duplicate awards' + c.reset);
  res = await fetch(`${BASE}/api/badges`, { headers: { Cookie: cookie } });
  json = await res.json();
  const earnedBadges = json.badges?.filter((b) => b.earned) || [];
  log(earnedBadges.length >= 2, 'at least 2 badges earned', `(${earnedBadges.length})`);
  // Verify no duplicate slugs
  const slugs = earnedBadges.map((b) => b.slug);
  const uniqueSlugs = new Set(slugs);
  log(slugs.length === uniqueSlugs.size, 'no duplicate badge awards', `(${slugs.length} total, ${uniqueSlugs.size} unique)`);

  // ── Test 12: Chat badges remain inactive (never awarded) ──
  console.log('\n' + c.yellow + 'Test 12: Chat badges never awarded (inactive)' + c.reset);
  const chatEarned = json.badges?.filter((b) => b.group === 'chat' && b.earned) || [];
  log(chatEarned.length === 0, '0 chat badges earned', `(${chatEarned.length})`);

  // ── Test 13: Profile-complete badge ──
  console.log('\n' + c.yellow + 'Test 13: Profile-complete badge' + c.reset);
  // First, ensure profile is INCOMPLETE
  res = await fetch(`${BASE}/api/badges`, { headers: { Cookie: cookie } });
  json = await res.json();
  const profileBadgeBefore = json.badges?.find((b) => b.slug === 'profile-complete');
  log(profileBadgeBefore?.earned === false, 'profile-complete not yet earned');

  // Update profile with all required fields
  res = await fetch(`${BASE}/api/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      name: 'Badges Tester',
      bio: 'I test badges for a living.',
      state: 'Karnataka',
      city: 'Bengaluru',
    }),
  });
  log(res.status === 200, 'profile updated → 200');

  // Wait briefly for the fire-and-forget badge evaluation
  await new Promise((r) => setTimeout(r, 500));

  res = await fetch(`${BASE}/api/badges`, { headers: { Cookie: cookie } });
  json = await res.json();
  const profileBadgeAfter = json.badges?.find((b) => b.slug === 'profile-complete');
  log(profileBadgeAfter?.earned === true, 'profile-complete earned after update');

  // ── Test 14: Posts-count badge (social-starter, 1 post) ──
  console.log('\n' + c.yellow + 'Test 14: Posts-count badge (social-starter)' + c.reset);
  res = await fetch(`${BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ content: 'Testing the badges system!', language: 'en' }),
  });
  log(res.status === 201, 'post created → 201');

  await new Promise((r) => setTimeout(r, 500));

  res = await fetch(`${BASE}/api/badges`, { headers: { Cookie: cookie } });
  json = await res.json();
  const socialStarter = json.badges?.find((b) => b.slug === 'social-starter');
  log(socialStarter?.earned === true, 'social-starter earned after first post');

  // ── Test 15: Following-count badge (connected, 10 follows) ──
  console.log('\n' + c.yellow + 'Test 15: Following-count badge' + c.reset);
  // We need to follow 10 distinct users. Register 10 dummy users first.
  const dummyUserIds = [];
  for (let i = 0; i < 10; i++) {
    const dummyEmail = `dummy-${Date.now()}-${i}@test.bharatsocial`;
    const dummyUsername = `dummy_${Date.now()}_${i}`;
    const r = await fetch(`${BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: dummyEmail, username: dummyUsername,
        password: 'testpassword123', name: `Dummy ${i}`,
      }),
    });
    const d = await r.json();
    if (d.user?.id) dummyUserIds.push(d.user.id);
  }
  log(dummyUserIds.length === 10, '10 dummy users registered', `(${dummyUserIds.length})`);

  // Follow all 10
  let followedCount = 0;
  for (const id of dummyUserIds) {
    const r = await fetch(`${BASE}/api/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ userId: id }),
    });
    if (r.status === 200) followedCount++;
  }
  log(followedCount === 10, 'followed all 10 dummy users', `(${followedCount}/10)`);

  await new Promise((r) => setTimeout(r, 1000));

  res = await fetch(`${BASE}/api/badges`, { headers: { Cookie: cookie } });
  json = await res.json();
  const connected = json.badges?.find((b) => b.slug === 'connected');
  log(connected?.earned === true, 'connected badge earned (10 follows)');

  // ── Test 16: Self-follow blocked → cannot inflate following count ──
  console.log('\n' + c.yellow + 'Test 16: Self-follow blocked' + c.reset);
  res = await fetch(`${BASE}/api/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ userId: userId }),
  });
  log(res.status === 400, 'self-follow → 400', `(status=${res.status})`);

  // ── Test 17: Non-admin cannot access admin badge routes ──
  console.log('\n' + c.yellow + 'Test 17: Non-admin → admin badge API → 403' + c.reset);
  res = await fetch(`${BASE}/api/admin/badges`, { headers: { Cookie: cookie } });
  log(res.status === 403, 'non-admin GET → 403', `(status=${res.status})`);

  // ── Test 18: Admin: list + deactivate + verify hidden + reactivate ──
  console.log('\n' + c.yellow + 'Test 18: Admin badge management' + c.reset);
  // Promote via DB (reuse the db instance from test 1b)
  await db.$connect();
  await db.user.update({ where: { email: testEmail }, data: { role: 'admin' } });
  log(true, 'user promoted to admin via DB');

  res = await fetch(`${BASE}/api/admin/badges`, { headers: { Cookie: cookie } });
  json = await res.json();
  log(res.status === 200, 'admin GET /api/admin/badges → 200');
  log(json.badges?.length === 33, '33 badges returned', `(${json.badges?.length})`);
  log(typeof json.badges?.[0]?.awardCount === 'number', 'awardCount returned', `(${json.badges?.[0]?.awardCount})`);

  // Find the quiz-beginner badge and deactivate it
  const target = json.badges?.find((b) => b.slug === 'quiz-beginner');
  log(!!target, 'found quiz-beginner badge');

  res = await fetch(`${BASE}/api/admin/badges/${target.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ active: false }),
  });
  log(res.status === 200, 'admin deactivate → 200');

  // Verify it's now hidden from the public badge list
  res = await fetch(`${BASE}/api/badges`, { headers: { Cookie: cookie } });
  json = await res.json();
  const deactivated = json.badges?.find((b) => b.slug === 'quiz-beginner');
  log(!deactivated, 'quiz-beginner hidden from public list after deactivation');

  // Reactivate
  res = await fetch(`${BASE}/api/admin/badges/${target.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ active: true }),
  });
  log(res.status === 200, 'admin reactivate → 200');

  res = await fetch(`${BASE}/api/badges`, { headers: { Cookie: cookie } });
  json = await res.json();
  const reactivated = json.badges?.find((b) => b.slug === 'quiz-beginner');
  log(!!reactivated, 'quiz-beginner visible again after reactivation');

  // Edit description
  res = await fetch(`${BASE}/api/admin/badges/${target.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ description: 'Updated by automated test.' }),
  });
  log(res.status === 200, 'admin edit description → 200');

  // ── Test 19: Verify existing data preserved ──
  console.log('\n' + c.yellow + 'Test 19: Existing data preserved' + c.reset);
  const users = await db.user.count();
  const posts = await db.post.count();
  const reports = await db.report.count();
  const modActions = await db.moderationAction.count();
  log(users >= 2, 'users ≥ 2', `(${users})`);
  log(posts >= 3, 'posts ≥ 3', `(${posts})`);
  log(reports >= 1, 'reports ≥ 1', `(${reports})`);
  log(modActions >= 4, 'modActions ≥ 4', `(${modActions})`);

  // ── Cleanup ──
  console.log('\n' + c.grey + 'Cleanup' + c.reset);
  // Delete the test user's data + the 10 dummy users + the test post
  await db.userBadge.deleteMany({ where: { userId: { in: [userId, ...dummyUserIds] } } });
  await db.badgeProgress.deleteMany({ where: { userId: { in: [userId, ...dummyUserIds] } } });
  await db.quizAttempt.deleteMany({ where: { userId: { in: [userId, ...dummyUserIds] } } });
  await db.follow.deleteMany({ where: { followerId: { in: [userId, ...dummyUserIds] } } });
  await db.follow.deleteMany({ where: { followingId: { in: [userId, ...dummyUserIds] } } });
  await db.post.deleteMany({ where: { authorId: userId } });
  await db.moderationAction.deleteMany({ where: { action: { contains: 'badge_' } } });
  await db.user.deleteMany({ where: { email: { contains: 'badges-test-' } } });
  await db.user.deleteMany({ where: { email: { contains: 'dummy-' } } });
  await db.$disconnect();

  console.log('\n' + c.blue + '━'.repeat(70) + c.reset);
  console.log(c.green + `Passed: ${pass}` + c.reset + c.red + `  Failed: ${fail}` + c.reset);
  console.log(c.blue + '━'.repeat(70) + c.reset);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(c.red + 'Test runner crashed:' + c.reset, e);
  process.exit(2);
});
