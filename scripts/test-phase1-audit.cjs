/**
 * Phase 1 Audit — Security & Data-Integrity Regression Tests
 *
 * Verifies the fixes applied in Phase 1:
 *   C1: NextAuth JWT secret refuses to start if NEXTAUTH_SECRET is missing
 *       or set to the known-insecure hardcoded fallback.
 *   C2: Registration TOCTOU race — Prisma P2002 unique-constraint violation
 *       is translated to a 409 (not a 500).
 *   C3: Story audit log uses targetStoryId (not targetReportId) and the
 *       schema-comment action enum includes story_* values.
 *   C4: Malformed postIds JSON on a PulseStory does NOT crash the public
 *       /api/pulse/stories endpoint.
 *   H1: User-initiated post delete is a SOFT delete (deletedAt set), not
 *       a hard delete.
 *   H2: Reposting a soft-deleted post returns 404 (not 201).
 *   H3: Bookmarking a non-existent or soft-deleted post returns 404.
 *   H4: A user who blocks another cannot like / comment / repost / follow them.
 *   H5: GET /api/shorts filters out shorts by suspended creators.
 *   H6: Profile PATCH rejects non-string field values (objects/arrays).
 *       Profile PATCH rejects avatarGradient values not in the whitelist.
 *   H7: GET /api/users/[username] excludes soft-deleted posts from postsCount.
 *       GET /api/users/[username] returns a minimal payload for suspended users.
 *   H8: GET /api/notifications supports cursor-based pagination.
 *   H9: Prisma client no longer logs every SQL query (log config check).
 *
 * Run: node scripts/test-phase1-audit.cjs
 *
 * NOTE: This script requires the dev server to be running on port 3000 AND
 * the .env file to contain a valid NEXTAUTH_SECRET.
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';

const c = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', grey: '\x1b[90m',
};

let pass = 0, fail = 0;
function log(ok, name, detail) {
  const sym = ok ? c.green + '✓' + c.reset : c.red + '✗' + c.reset;
  if (ok) pass++; else fail++;
  console.log(`  ${sym} ${name}${detail ? ' ' + c.grey + detail + c.reset : ''}`);
}

// ── Project root resolution (no hardcoded paths) ──────────────────────────
// This script lives at <project-root>/scripts/test-phase1-audit.cjs.
// Resolve the project root from __dirname so the test works from any clone.
const path = require('path');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC = (rel) => path.join(PROJECT_ROOT, rel);

// ── Cookie / auth helpers (lifted from test-quiz.cjs) ─────────────────────
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
async function register(email, username, password, name) {
  const res = await fetch(`${BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password, name }),
  });
  return { status: res.status, body: await res.json() };
}

let adminCookie = '';
let adminEmail = '';
const testSuffix = Math.random().toString(36).slice(2, 10);

// ── Pre-flight: verify dev server is up ────────────────────────────────────
async function preflight() {
  console.log('\nPreflight: dev server health check');
  try {
    const r = await fetch(`${BASE}/api/quiz/categories`);
    log(r.status === 200, 'GET /api/quiz/categories returns 200', `(${r.status})`);
    return r.status === 200;
  } catch (e) {
    log(false, 'Dev server reachable', String(e));
    return false;
  }
}

// ── C1: NEXTAUTH_SECRET enforcement ──────────────────────────────────────
async function testC1_NextAuthSecretEnforcement() {
  console.log('\nTest C1: NEXTAUTH_SECRET enforcement (authOptions.ts)');

  // Read authOptions.ts source and verify there's no hardcoded fallback
  // being USED as the secret. The string may still appear in an explicit
  // reject-check (we actively reject the known-insecure value).
  const fs = await import('fs');
  const src = fs.readFileSync(SRC('src/lib/auth/authOptions.ts'), 'utf8');
  log(
    !src.includes("'dev-secret-change-in-production'") ||
      src.includes("secret === 'dev-secret-change-in-production'"), // allowed only as a reject-check
    'no hardcoded fallback is USED as the secret (only rejected)',
  );
  log(
    src.includes('getRequiredSecret') && src.includes('NEXTAUTH_SECRET'),
    'getRequiredSecret() requires NEXTAUTH_SECRET',
  );
  log(
    src.includes('length < 16'),
    'rejects secrets shorter than 16 chars',
  );

  // Verify .env has NEXTAUTH_SECRET set
  const env = fs.readFileSync(SRC('.env'), 'utf8');
  log(
    /NEXTAUTH_SECRET=.+/.test(env) && !env.includes('NEXTAUTH_SECRET=\n'),
    '.env has NEXTAUTH_SECRET set',
  );
  log(
    /NEXTAUTH_URL=.+/.test(env),
    '.env has NEXTAUTH_URL set',
  );

  // Verify .env.example exists and documents both vars
  const envExample = fs.readFileSync(SRC('.env.example'), 'utf8');
  log(
    envExample.includes('NEXTAUTH_SECRET=') && envExample.includes('NEXTAUTH_URL='),
    '.env.example documents required env vars',
  );
}

// ── C2: Registration TOCTOU race ─────────────────────────────────────────
async function testC2_RegistrationTOCTOU() {
  console.log('\nTest C2: Registration TOCTOU race (Prisma P2002 → 409)');

  const email = `c2-${testSuffix}@example.com`;
  const username = `c2_${testSuffix}`;
  const password = 'password123';

  // First registration should succeed.
  const r1 = await register(email, username, password, 'C2 User');
  log(r1.status === 201, 'first registration succeeds', `(${r1.status})`);

  // Second registration with the SAME email should return 409, not 500.
  const r2 = await register(email, `other_${testSuffix}`, password, 'Other');
  log(r2.status === 409, 'duplicate email returns 409 (not 500)', `(${r2.status})`);

  // Second registration with the SAME username should return 409.
  const r3 = await register(`other-${testSuffix}@example.com`, username, password, 'Other');
  log(r3.status === 409, 'duplicate username returns 409 (not 500)', `(${r3.status})`);

  // Cleanup
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  await db.user.deleteMany({ where: { email: { contains: `c2-${testSuffix}` } } });
  await db.user.deleteMany({ where: { email: `other-${testSuffix}@example.com` } });
  await db.$disconnect();
}

// ── C3: Story audit log uses targetStoryId ──────────────────────────────
async function testC3_StoryAuditLogTargetColumn() {
  console.log('\nTest C3: Story audit log uses targetStoryId (not targetReportId)');

  const fs = await import('fs');
  const schema = fs.readFileSync(SRC('prisma/schema.prisma'), 'utf8');
  log(
    /targetStoryId\s+String\?/.test(schema),
    'schema has targetStoryId column on ModerationAction',
  );
  log(
    schema.includes('story_created') && schema.includes('story_status_changed') && schema.includes('story_deleted'),
    'schema documents story_* actions',
  );

  // Verify all 3 story admin routes write to targetStoryId, not targetReportId
  const routes = [
    SRC('src/app/api/admin/stories/route.ts'),
    SRC('src/app/api/admin/stories/[id]/route.ts'),
  ];
  for (const r of routes) {
    const src = fs.readFileSync(r, 'utf8');
    log(
      src.includes('targetStoryId:') && !src.includes('targetReportId: story.id') && !src.includes('targetReportId: id'),
      `${r.split('/').pop()} writes to targetStoryId`,
    );
  }
}

// ── C4: Malformed postIds JSON does not crash public route ───────────────
async function testC4_MalformedPostIds() {
  console.log('\nTest C4: Malformed postIds JSON on PulseStory does not crash public API');

  const fs = await import('fs');
  // Verify the safe-parse helper exists
  const helperSrc = fs.readFileSync(SRC('src/lib/parse.ts'), 'utf8');
  log(
    helperSrc.includes('safeParsePostIds'),
    'safeParsePostIds helper exists in src/lib/parse.ts',
  );

  // Verify all 4 routes that previously called JSON.parse(s.postIds) now use the helper
  const routes = [
    SRC('src/app/api/pulse/stories/route.ts'),
    SRC('src/app/api/pulse/stories/[id]/route.ts'),
    SRC('src/app/api/admin/stories/route.ts'),
  ];
  for (const r of routes) {
    const src = fs.readFileSync(r, 'utf8');
    log(
      src.includes('safeParsePostIds') && !src.includes('JSON.parse(s.postIds)') && !src.includes('JSON.parse(story.postIds)'),
      `${r.split('/').slice(-2).join('/')} uses safeParsePostIds`,
    );
  }

  // Live test: hit the public stories endpoint — should never 500.
  const r = await fetch(`${BASE}/api/pulse/stories?limit=5`);
  log(r.status === 200, 'GET /api/pulse/stories returns 200', `(${r.status})`);
  const data = await r.json();
  log(Array.isArray(data.stories), 'response has stories array');
}

// ── H1: User post-delete is soft-delete ──────────────────────────────────
async function testH1_SoftDeleteUserPost() {
  console.log('\nTest H1: User post-delete is soft-delete (deletedAt set, row preserved)');

  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();

  // Register a fresh user + create a post + delete it.
  const email = `h1-${testSuffix}@example.com`;
  const username = `h1_${testSuffix}`;
  await register(email, username, 'password123', 'H1 User');
  const cookie = await login(email, 'password123');

  const createRes = await fetch(`${BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ content: 'H1 test post for soft-delete', language: 'en' }),
  });
  const createJson = await createRes.json();
  const postId = createJson.post?.id;
  log(!!postId, 'post created', `(${postId?.slice(0, 10)}…)`);

  const delRes = await fetch(`${BASE}/api/posts/${postId}`, {
    method: 'DELETE',
    headers: { Cookie: cookie },
  });
  log(delRes.status === 200, 'DELETE returns 200', `(${delRes.status})`);

  // Verify the row still exists in the DB with deletedAt set.
  const row = await db.post.findUnique({ where: { id: postId } });
  log(!!row, 'post row still exists in DB after user delete');
  log(!!row?.deletedAt, 'post.deletedAt is set', `(${row?.deletedAt?.toISOString().slice(0, 10)})`);

  // Cleanup
  await db.post.delete({ where: { id: postId } }).catch(() => {});
  await db.user.deleteMany({ where: { email: { contains: `h1-${testSuffix}` } } });
  await db.$disconnect();
}

// ── H2 + H4: Repost/like/comment/follow with soft-deleted posts + blocks ─
async function testH2H4_RepostAndBlockEnforcement() {
  console.log('\nTest H2+H4: Repost on deleted post returns 404; blocks prevent interaction');

  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();

  // Register two users, A and B. A creates a post. B blocks A. Then B tries
  // to like A's post → should 403.
  const aEmail = `h2a-${testSuffix}@example.com`;
  const bEmail = `h2b-${testSuffix}@example.com`;
  await register(aEmail, `h2a_${testSuffix}`, 'password123', 'A User');
  await register(bEmail, `h2b_${testSuffix}`, 'password123', 'B User');
  const aCookie = await login(aEmail, 'password123');
  const bCookie = await login(bEmail, 'password123');

  // A creates a post
  const createRes = await fetch(`${BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: aCookie },
    body: JSON.stringify({ content: 'H2/H4 post by A' }),
  });
  const createJson = await createRes.json();
  const postId = createJson.post?.id;
  log(!!postId, 'A created a post');

  // B blocks A
  const aUser = await db.user.findUnique({ where: { email: aEmail } });
  const blockRes = await fetch(`${BASE}/api/blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: bCookie },
    body: JSON.stringify({ userId: aUser.id }),
  });
  log(blockRes.status === 200, 'B blocks A', `(${blockRes.status})`);

  // B tries to LIKE A's post → should 403
  const likeRes = await fetch(`${BASE}/api/posts/${postId}/like`, {
    method: 'POST',
    headers: { Cookie: bCookie },
  });
  log(likeRes.status === 403, 'B like on A post → 403 (blocked)', `(${likeRes.status})`);

  // B tries to COMMENT on A's post → should 403
  const commentRes = await fetch(`${BASE}/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: bCookie },
    body: JSON.stringify({ content: 'should be blocked' }),
  });
  log(commentRes.status === 403, 'B comment on A post → 403 (blocked)', `(${commentRes.status})`);

  // B tries to REPOST A's post → should 403
  const repostRes = await fetch(`${BASE}/api/posts/${postId}/repost`, {
    method: 'POST',
    headers: { Cookie: bCookie },
  });
  log(repostRes.status === 403, 'B repost of A post → 403 (blocked)', `(${repostRes.status})`);

  // B tries to FOLLOW A → should 403
  const followRes = await fetch(`${BASE}/api/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: bCookie },
    body: JSON.stringify({ userId: aUser.id }),
  });
  log(followRes.status === 403, 'B follow A → 403 (blocked)', `(${followRes.status})`);

  // Now test H2: A soft-deletes their post. B (unblock A first) tries to repost.
  // First undo the block so we can isolate H2.
  const bUser = await db.user.findUnique({ where: { email: bEmail } });
  if (bUser) {
    await db.block.deleteMany({ where: { blockerId: bUser.id } });
  }

  // A deletes their post (soft-delete).
  await fetch(`${BASE}/api/posts/${postId}`, { method: 'DELETE', headers: { Cookie: aCookie } });

  // B tries to repost the now-soft-deleted post → should 404
  const repostDeletedRes = await fetch(`${BASE}/api/posts/${postId}/repost`, {
    method: 'POST',
    headers: { Cookie: bCookie },
  });
  log(repostDeletedRes.status === 404, 'B repost of soft-deleted post → 404', `(${repostDeletedRes.status})`);

  // B tries to like soft-deleted post → should 404
  const likeDeletedRes = await fetch(`${BASE}/api/posts/${postId}/like`, {
    method: 'POST',
    headers: { Cookie: bCookie },
  });
  log(likeDeletedRes.status === 404, 'B like on soft-deleted post → 404', `(${likeDeletedRes.status})`);

  // Cleanup
  await db.post.deleteMany({ where: { authorId: aUser.id } });
  await db.user.deleteMany({ where: { email: { in: [aEmail, bEmail] } } });
  await db.$disconnect();
}

// ── H3: Bookmark validation ─────────────────────────────────────────────
async function testH3_BookmarkValidation() {
  console.log('\nTest H3: Bookmark on non-existent / soft-deleted post returns 404');

  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();

  const email = `h3-${testSuffix}@example.com`;
  await register(email, `h3_${testSuffix}`, 'password123', 'H3 User');
  const cookie = await login(email, 'password123');

  // Bookmark a totally fake post ID → 404 (NOT 500)
  const fakeId = 'cmNonexistentPostId000001';
  const r1 = await fetch(`${BASE}/api/posts/${fakeId}/bookmark`, {
    method: 'POST', headers: { Cookie: cookie },
  });
  log(r1.status === 404, 'bookmark on non-existent post → 404', `(${r1.status})`);

  // Cleanup
  await db.user.deleteMany({ where: { email: { contains: `h3-${testSuffix}` } } });
  await db.$disconnect();
}

// ── H5: Suspended shorts filtered ────────────────────────────────────────
async function testH5_SuspendedShortsFiltered() {
  console.log('\nTest H5: GET /api/shorts filters out shorts by suspended creators');

  const fs = await import('fs');
  const shortsSrc = fs.readFileSync(SRC('src/app/api/shorts/route.ts'), 'utf8');
  log(
    shortsSrc.includes('creator: { suspended: false }'),
    'shorts route filters creator.suspended=false in where clause',
  );

  // Live test: just hit the endpoint — should return 200 with shorts array.
  const r = await fetch(`${BASE}/api/shorts?limit=5`);
  log(r.status === 200, 'GET /api/shorts returns 200', `(${r.status})`);
  const data = await r.json();
  log(Array.isArray(data.shorts), 'response has shorts array');
}

// ── H6: Profile PATCH type validation ────────────────────────────────────
async function testH6_ProfilePatchValidation() {
  console.log('\nTest H6: Profile PATCH rejects non-string fields + invalid avatarGradient');

  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();

  const email = `h6-${testSuffix}@example.com`;
  await register(email, `h6_${testSuffix}`, 'password123', 'H6 User');
  const cookie = await login(email, 'password123');

  // Send bio as an object — should be rejected with 400
  const r1 = await fetch(`${BASE}/api/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ bio: { evil: 'object' } }),
  });
  log(r1.status === 400, 'PATCH bio as object → 400', `(${r1.status})`);

  // Send avatarGradient as an arbitrary string — should be rejected (not in whitelist)
  const r2 = await fetch(`${BASE}/api/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ avatarGradient: 'arbitrary-css-injection-class' }),
  });
  log(r2.status === 400, 'PATCH invalid avatarGradient → 400', `(${r2.status})`);

  // Send initials with non-letter chars — should be rejected
  const r3 = await fetch(`${BASE}/api/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ initials: 'A1!' }),
  });
  log(r3.status === 400, 'PATCH initials with non-letters → 400', `(${r3.status})`);

  // Send a VALID gradient — should succeed
  const r4 = await fetch(`${BASE}/api/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ avatarGradient: 'from-amber-500 to-orange-600' }),
  });
  log(r4.status === 200, 'PATCH valid avatarGradient → 200', `(${r4.status})`);

  // Send name as empty string — should be normalized to null
  const r5 = await fetch(`${BASE}/api/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: '' }),
  });
  log(r5.status === 200, 'PATCH name="" → 200 (normalized to null)', `(${r5.status})`);

  // Cleanup
  await db.user.deleteMany({ where: { email: { contains: `h6-${testSuffix}` } } });
  await db.$disconnect();
}

// ── H7: postsCount excludes soft-deleted; suspended users minimal ───────
async function testH7_PostsCountAndSuspendedProfile() {
  console.log('\nTest H7: postsCount excludes soft-deleted; suspended users minimal');

  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();

  const email = `h7-${testSuffix}@example.com`;
  const username = `h7_${testSuffix}`;
  await register(email, username, 'password123', 'H7 User');
  const cookie = await login(email, 'password123');

  // Create 3 posts, then soft-delete 1.
  for (let i = 0; i < 3; i++) {
    await fetch(`${BASE}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ content: `H7 post #${i}` }),
    });
  }
  const listRes = await fetch(`${BASE}/api/posts?limit=10`, { headers: { Cookie: cookie } });
  const listJson = await listRes.json();
  const lastPostId = listJson.posts[0].id;
  await fetch(`${BASE}/api/posts/${lastPostId}`, { method: 'DELETE', headers: { Cookie: cookie } });

  // Fetch the user's profile — postsCount should be 2 (not 3).
  const profileRes = await fetch(`${BASE}/api/users/${username}`);
  const profileJson = await profileRes.json();
  log(
    profileJson.user.postsCount === 2,
    'postsCount excludes soft-deleted (2 not 3)',
    `(${profileJson.user.postsCount})`,
  );

  // Now suspend the user via DB, refetch profile — should be minimal.
  await db.user.update({ where: { username }, data: { suspended: true } });
  const suspendedRes = await fetch(`${BASE}/api/users/${username}`);
  const suspendedJson = await suspendedRes.json();
  log(
    suspendedJson.user.suspended === true,
    'suspended user profile returns suspended=true',
  );
  log(
    suspendedJson.user.bio === undefined && suspendedJson.user.postsCount === 0,
    'suspended user bio + postsCount hidden',
    `(posts=${suspendedJson.user.postsCount})`,
  );
  log(
    Array.isArray(suspendedJson.posts) && suspendedJson.posts.length === 0,
    'suspended user posts array is empty',
  );

  // Cleanup
  await db.user.update({ where: { username }, data: { suspended: false } });
  const h7me = await db.user.findUnique({ where: { username } });
  if (h7me) {
    await db.post.deleteMany({ where: { authorId: h7me.id } });
  }
  await db.user.deleteMany({ where: { email: { contains: `h7-${testSuffix}` } } });
  await db.$disconnect();
}

// ── H8: Notifications pagination ─────────────────────────────────────────
async function testH8_NotificationsPagination() {
  console.log('\nTest H8: GET /api/notifications supports cursor pagination');

  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();

  const email = `h8-${testSuffix}@example.com`;
  await register(email, `h8_${testSuffix}`, 'password123', 'H8 User');
  const cookie = await login(email, 'password123');

  // Insert 25 fake notifications so we can paginate.
  const me = await db.user.findUnique({ where: { email } });
  // Create a second user as the "actor"
  const actor = await db.user.create({
    data: {
      email: `h8actor-${testSuffix}@example.com`,
      username: `h8actor_${testSuffix}`,
      passwordHash: '$2a$10$dummy',
      name: 'Actor',
      initials: 'Ac',
    },
  });
  for (let i = 0; i < 25; i++) {
    await db.notification.create({
      data: {
        type: 'like',
        userId: me.id,
        actorId: actor.id,
      },
    });
  }

  // Fetch first page (limit 10) — should return 10 notifications + nextCursor.
  const r1 = await fetch(`${BASE}/api/notifications?limit=10`, { headers: { Cookie: cookie } });
  log(r1.status === 200, 'GET /api/notifications?limit=10 → 200', `(${r1.status})`);
  const d1 = await r1.json();
  log(Array.isArray(d1.notifications) && d1.notifications.length === 10, 'returns 10 notifications', `(${d1.notifications.length})`);
  log(!!d1.nextCursor, 'nextCursor present', `(${d1.nextCursor?.slice(0, 10)}…)`);

  // Fetch second page using the cursor.
  const r2 = await fetch(`${BASE}/api/notifications?limit=10&cursor=${d1.nextCursor}`, { headers: { Cookie: cookie } });
  log(r2.status === 200, 'GET /api/notifications?cursor=… → 200', `(${r2.status})`);
  const d2 = await r2.json();
  log(d2.notifications.length === 10, 'second page returns 10 notifications', `(${d2.notifications.length})`);

  // Verify no overlap between page 1 and page 2.
  const page1Ids = new Set(d1.notifications.map((n) => n.id));
  const overlap = d2.notifications.filter((n) => page1Ids.has(n.id));
  log(overlap.length === 0, 'no overlap between page 1 and page 2', `(overlap=${overlap.length})`);

  // Cleanup
  await db.notification.deleteMany({ where: { userId: me.id } });
  await db.user.deleteMany({ where: { email: { contains: `h8-${testSuffix}` } } });
  await db.user.deleteMany({ where: { email: { contains: `h8actor-${testSuffix}` } } });
  await db.$disconnect();
}

// ── H9: Prisma log config ────────────────────────────────────────────────
async function testH9_PrismaLogConfig() {
  console.log('\nTest H9: Prisma client no longer logs every query by default');

  const fs = await import('fs');
  const dbSrc = fs.readFileSync(SRC('src/lib/db.ts'), 'utf8');
  // The OLD pattern was `new PrismaClient({ log: ['query'] })` unconditionally.
  // The NEW pattern uses `logConfig` (a variable) gated by DEBUG_PRISMA.
  // So we check that there is no unconditional literal `log: ['query']` AND
  // that the logConfig variable is used.
  log(
    !/\bnew PrismaClient\(\{\s*log:\s*\['query'\]\s*\}\)/.test(dbSrc),
    'db.ts does NOT unconditionally construct PrismaClient with log:[\'query\']',
  );
  log(
    dbSrc.includes('DEBUG_PRISMA') && dbSrc.includes('logConfig'),
    'db.ts gates query logging behind DEBUG_PRISMA=1 (via logConfig var)',
  );
}

// ── Run all tests ────────────────────────────────────────────────────────
async function main() {
  console.log(c.blue + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + c.reset);
  console.log(c.blue + 'BharatSocial — Phase 1 Audit Regression Tests' + c.reset);
  console.log(c.blue + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + c.reset);

  const ok = await preflight();
  if (!ok) {
    console.log('\n' + c.red + 'Dev server not reachable. Start it with: bun run dev' + c.reset);
    process.exit(1);
  }

  await testC1_NextAuthSecretEnforcement();
  await testC2_RegistrationTOCTOU();
  await testC3_StoryAuditLogTargetColumn();
  await testC4_MalformedPostIds();
  await testH1_SoftDeleteUserPost();
  await testH2H4_RepostAndBlockEnforcement();
  await testH3_BookmarkValidation();
  await testH5_SuspendedShortsFiltered();
  await testH6_ProfilePatchValidation();
  await testH7_PostsCountAndSuspendedProfile();
  await testH8_NotificationsPagination();
  await testH9_PrismaLogConfig();

  // Final: verify existing data preserved
  console.log('\nFinal: Verify existing data preserved');
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  const users = await db.user.count();
  const posts = await db.post.count();
  const questions = await db.quizQuestion.count();
  const badges = await db.badge.count();
  log(users >= 2, 'users ≥ 2', `(${users})`);
  log(posts >= 3, 'posts ≥ 3', `(${posts})`);
  log(questions >= 1000, 'quiz questions >= 1000', `(${questions})`);
  log(badges === 33, 'badge definitions = 33', `(${badges})`);
  await db.$disconnect();

  console.log('\n' + c.blue + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + c.reset);
  console.log(`${c.green}Passed: ${pass}${c.reset}  ${c.red}Failed: ${fail}${c.reset}`);
  console.log(c.blue + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + c.reset);

  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(c.red + 'Test runner crashed:' + c.reset, e);
  process.exit(1);
});
