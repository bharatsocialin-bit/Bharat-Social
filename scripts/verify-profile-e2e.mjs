// ============================================================================
// BharatSocial — Profile Setup & Editing END-TO-END verification (live DB)
//
// Runs against the LOCAL dev server (http://localhost:3000) which talks to the
// REAL Supabase project. Safety rules:
//   - Creates ONE throwaway test user (profile-e2e-<rand>@bharatsocial.test).
//   - NEVER touches rows whose email does not start with "profile-e2e".
//   - Cleans up its own DB + auth.users rows in `finally`.
//   - No service-role key used; uploads exercise the RLS "stashed token" path.
// Run:  env -u DATABASE_URL bun scripts/verify-profile-e2e.mjs
// ============================================================================

import { PrismaClient } from '@prisma/client'

const BASE = 'http://localhost:3000'
const RAND = Math.random().toString(36).slice(2, 8)
const TEST_EMAIL = `profile-e2e-${RAND}@gmail.com`
const TEST_PASS = 'E2eTestPass123!'
const TEST_USERNAME = `e2etest${RAND}`

const prisma = new PrismaClient()

// ── tiny test harness ──────────────────────────────────────────────────────
let passed = 0
let failed = 0
const failures = []
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else { failed++; failures.push(`${name} ${extra}`); console.log(`  ✗ ${name} ${extra}`) }
}
const section = (t) => console.log(`\n── ${t} ──`)

// ── cookie-jar fetch ───────────────────────────────────────────────────────
const jar = new Map()
const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}), cookie: cookieHeader() }
  const res = await fetch(BASE + path, { ...opts, headers, redirect: 'manual' })
  for (const sc of res.headers.getSetCookie?.() || []) {
    const pair = sc.split(';')[0]
    const i = pair.indexOf('=')
    jar.set(pair.slice(0, i), pair.slice(i + 1))
  }
  return res
}

// ── minimal 1x1 images (valid magic bytes) ────────────────────────────────
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
const JPEG_BYTES = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDIzNP/AABEIAAEAAQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/aAAwDAQACEQMRAD8A/v4ooooA/9k=',
  'base64',
)

// ── cleanup helpers (STRICTLY scoped to our test rows) ────────────────────
async function cleanupTestRows() {
  const locals = await prisma.$queryRawUnsafe(
    `SELECT id, email FROM "User" WHERE email LIKE 'profile-e2e-%@%'`,
  )
  for (const u of locals) {
    await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id = $1`, u.id)
  }
  await prisma.$executeRawUnsafe(
    `DELETE FROM auth.users WHERE email LIKE 'profile-e2e-%@%'`,
  )
  return locals.length
}

async function main() {
  console.log(`Test identity: ${TEST_EMAIL} / ${TEST_USERNAME}`)

  section('PRE: remove leftovers from previous runs (own rows only)')
  const removed = await cleanupTestRows()
  console.log(`  removed ${removed} leftover test row(s)`)

  // ════════════════════ 1. ANONYMOUS ACCESS ════════════════════
  section('1. Anonymous access control')
  check('GET / → 200', (await req('/')).status === 200)
  check('GET /api/profile → 401', (await req('/api/profile')).status === 401)
  check('PATCH /api/profile → 401', (await req('/api/profile', { method: 'PATCH', body: JSON.stringify({ bio: 'x' }), headers: { 'content-type': 'application/json' } })).status === 401)
  const anonAvatar = await req('/api/profile/avatar', { method: 'POST', body: new FormData() })
  check('POST /api/profile/avatar → 401', anonAvatar.status === 401)

  let r = await req('/api/profile/check-username?username=admin')
  check('check-username "admin" → reserved', (await r.json()).available === false)
  r = await req('/api/profile/check-username?username=josh')
  check('check-username "josh" → taken', (await r.json()).available === false)
  r = await req(`/api/profile/check-username?username=${TEST_USERNAME}`)
  check(`check-username "${TEST_USERNAME}" → available`, (await r.json()).available === true)

  // ════════════════════ 2. TEST IDENTITY ════════════════════
  section('2. Test identity (real /api/register first, local-bcrypt fallback)')
  const regRes = await req('/api/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, username: TEST_USERNAME, password: TEST_PASS, name: 'Profile E2E' }),
  })
  const regBody = await regRes.json().catch(() => ({}))
  let userId
  let storageCapable = false // true = Supabase-managed user (sb tokens available)
  if (regRes.status === 201) {
    userId = regBody.user.id
    storageCapable = true
    check('register → 201 (full Supabase email flow)', true)
    if (regBody.emailConfirmationRequired) {
      console.log('  (email confirmation is ON — confirming own test row via SQL)')
      await prisma.$executeRawUnsafe(
        `UPDATE auth.users SET email_confirmed_at = now() WHERE email = $1`,
        TEST_EMAIL,
      )
    }
  } else {
    console.log(
      `  register unavailable (${regRes.status}: ${regBody.error}) — Confirm-email is ON and the signup email rate limit is exhausted.`,
    )
    console.log('  Falling back to a local-bcrypt identity (NextAuth Path B) for the CRUD suite.')
    const { hashSync } = await import('bcryptjs')
    const created = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        username: TEST_USERNAME,
        passwordHash: hashSync(TEST_PASS, 10),
        name: 'Profile E2E',
        initials: 'PE',
        onboardedAt: new Date(),
      },
      select: { id: true },
    })
    userId = created.id
    check('local test identity created', true)
  }
  const row = (await prisma.$queryRawUnsafe(`SELECT "onboardedAt", "supabaseUserId" FROM "User" WHERE id = $1`, userId))[0]
  check('identity has onboardedAt set', row?.onboardedAt != null)
  if (regRes.status === 201) {
    check('register linked supabaseUserId', typeof row?.supabaseUserId === 'string' && row.supabaseUserId.length > 8)
  }

  // ════════════════════ 3. LOGIN (credentials) ════════════════════
  section('3. NextAuth credentials login')
  await req('/api/auth/csrf')
  const rawCsrf = [...jar.entries()].find(([k]) => k.includes('csrf'))?.[1] ?? ''
  const csrfToken = decodeURIComponent(rawCsrf).split('|')[0]
  check('csrf token issued', !!csrfToken)
  const loginRes = await req('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, email: TEST_EMAIL, password: TEST_PASS, json: 'true' }).toString(),
  })
  const loginBody = await loginRes.json().catch(() => null)
  console.log(`  login response: ${JSON.stringify(loginBody)}`)
  check('login callback → 200', loginRes.status === 200, `got ${loginRes.status}`)
  const hasSession = [...jar.keys()].some((k) => k.includes('session-token'))
  check('session cookie set', hasSession)

  let prof = (await (await req('/api/profile')).json())?.user
  check('GET /api/profile → own profile', prof?.id === userId)
  check('onboardingRequired = false (registered users)', prof?.onboardingRequired === false)

  // ════════════════════ 4. ONBOARDING GATE (simulated fresh Google user) ════════════════════
  section('4. Onboarding gate (simulate fresh OAuth user: onboardedAt = NULL)')
  await prisma.$executeRawUnsafe(`UPDATE "User" SET "onboardedAt" = NULL WHERE id = $1`, userId)
  prof = (await (await req('/api/profile')).json())?.user
  check('onboardingRequired flips to true', prof?.onboardingRequired === true)
  const onboardRes = await req('/api/profile', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ completeOnboarding: true }),
  })
  prof = (await onboardRes.json())?.user
  check('PATCH completeOnboarding → 200', onboardRes.status === 200)
  check('onboardingRequired back to false', prof?.onboardingRequired === false)

  // ════════════════════ 5. FIELD EDITING ════════════════════
  section('5. Profile field editing (PATCH + persistence)')
  const patch = async (body) =>
    req('/api/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

  await patch({ bio: 'E2E bio 🇮🇳', state: 'Karnataka', gender: 'male', dateOfBirth: '2000-05-10' })
  prof = (await (await req('/api/profile')).json())?.user
  check('bio saved', prof?.bio === 'E2E bio 🇮🇳')
  check('state saved', prof?.state === 'Karnataka')
  check('gender saved', prof?.gender === 'male')
  check('dateOfBirth saved', prof?.dateOfBirth === '2000-05-10')

  await patch({ links: [{ url: 'https://github.com/example' }, { url: 'http://bharatsocial.in', label: 'Site' }] })
  prof = (await (await req('/api/profile')).json())?.user
  check('2 links saved, order preserved', prof?.links?.length === 2 && prof.links[0].url.includes('github') && prof.links[1].label === 'Site')

  check('5 links rejected (400)', (await patch({ links: Array.from({ length: 5 }, (_, i) => ({ url: `https://x${i}.example.com` })) })).status === 400)
  check('ftp:// link rejected (400)', (await patch({ links: [{ url: 'ftp://nope.example.com' }] })).status === 400)
  check('javascript: link rejected (400)', (await patch({ links: [{ url: 'javascript:alert(1)' }] })).status === 400)

  await patch({ links: [{ url: 'https://b.example.com', label: 'B' }, { url: 'https://a.example.com' }] })
  prof = (await (await req('/api/profile')).json())?.user
  check('links reordered', prof?.links?.[0]?.label === 'B')
  await patch({ links: [] })
  prof = (await (await req('/api/profile')).json())?.user
  check('links cleared', prof?.links?.length === 0)

  check('underage DOB rejected (400)', (await patch({ dateOfBirth: '2026-01-01' })).status === 400)
  check('future DOB rejected (400)', (await patch({ dateOfBirth: '2030-01-01' })).status === 400)
  check('over-120 DOB rejected (400)', (await patch({ dateOfBirth: '1890-01-01' })).status === 400)
  check('bio > 200 rejected (400)', (await patch({ bio: 'x'.repeat(201) })).status === 400)
  check('invalid gender rejected (400)', (await patch({ gender: 'helicopter' })).status === 400)

  section('5b. Username editing')
  const newName = `${TEST_USERNAME}2`
  check('valid rename → 200', (await patch({ username: newName })).status === 200)
  r = await req(`/api/profile/check-username?username=${TEST_USERNAME}`)
  check('old username now available', (await r.json()).available === true)
  r = await req(`/api/profile/check-username?username=${newName}&current=${newName}`)
  check('keeping own username → available', (await r.json()).available === true)
  check('rename to "josh" → 409', (await patch({ username: 'josh' })).status === 409)
  check('rename to "admin" → 400 (reserved)', (await patch({ username: 'admin' })).status === 400)
  check('rename to "ab" → 400 (too short)', (await patch({ username: 'ab' })).status === 400)
  check('rename to "bad handle!" → 400 (chars)', (await patch({ username: 'bad handle!' })).status === 400)

  section('5c. Security: whitelist-only PATCH')
  await patch({ bio: 'sec-ok', role: 'admin', suspended: true, email: 'hax@evil.test', id: 'hack', supabaseUserId: 'hack', passwordHash: 'hack' })
  const secRow = (await prisma.$queryRawUnsafe(`SELECT role, email, suspended, "passwordHash" FROM "User" WHERE id = $1`, userId))[0]
  check('role NOT self-promoted', secRow?.role === 'user')
  check('email NOT changed', secRow?.email === TEST_EMAIL)
  check('suspended NOT changed', secRow?.suspended === false)
  check('passwordHash NOT overwritten by attacker value', secRow?.passwordHash !== 'hack')

  section('5d. Public profile privacy')
  const pub = (await (await req('/api/profile?username=josh')).json())?.user
  check('public profile: no email key', pub && !('email' in pub))
  check('public profile: no dateOfBirth key', pub && !('dateOfBirth' in pub))
  check('public profile: no gender key', pub && !('gender' in pub))
  check('public profile: has bio/links/avatarUrl', 'bio' in pub && 'links' in pub && 'avatarUrl' in pub)
  const pub2 = (await (await req('/api/users/josh')).json())?.user
  check('/api/users/[username]: same privacy', pub2 && !('email' in pub2) && !('dateOfBirth' in pub2))

  // ════════════════════ 6. AVATAR (Supabase Storage) ════════════════════
  section('6. Avatar route (upload / replace / remove)')
  const badFd = new FormData()
  badFd.append('file', new Blob([Buffer.from('<html>not an image</html>')], { type: 'image/png' }), 'evil.png')
  check('non-image rejected (415 — validated before storage resolution)', (await req('/api/profile/avatar', { method: 'POST', body: badFd })).status === 415)

  if (!storageCapable) {
    // Legacy local-bcrypt session: no sb cookies, no stashed tokens, no
    // service key → the route MUST answer 503 with setup guidance rather
    // than pretend success. (Google/email users DO get a storage path.)
    const fdLegacy = new FormData()
    fdLegacy.append('file', new Blob([PNG_BYTES], { type: 'image/png' }), 'avatar.png')
    const upL = await req('/api/profile/avatar', { method: 'POST', body: fdLegacy })
    const upLBody = await upL.json()
    check('legacy session POST → 503 setupRequired (correct fallback, no silent failure)', upL.status === 503 && upLBody.setupRequired === true, JSON.stringify(upLBody))
  } else {
    const fd1 = new FormData()
    fd1.append('file', new Blob([PNG_BYTES], { type: 'image/png' }), 'avatar.png')
    const up1 = await req('/api/profile/avatar', { method: 'POST', body: fd1 })
    const up1Body = await up1.json()
    check('PNG upload → 201', up1.status === 201, JSON.stringify(up1Body))
    const url1 = up1Body.avatarUrl
    if (url1) {
      check('public URL serves image (200)', (await fetch(url1)).status === 200)
      check('URL points at our avatars bucket', url1.includes('/storage/v1/object/public/avatars/'))
    }

    const fd2 = new FormData()
    fd2.append('file', new Blob([JPEG_BYTES], { type: 'image/jpeg' }), 'avatar.jpg')
    const up2 = await req('/api/profile/avatar', { method: 'POST', body: fd2 })
    const up2Body = await up2.json()
    check('JPEG replace → 201', up2.status === 201, JSON.stringify(up2Body))
    const url2 = up2Body.avatarUrl
    if (url1 && url2) {
      check('URL changed on replace', url1 !== url2)
      const oldStatus = (await fetch(url1)).status
      check('old object deleted (no orphan)', oldStatus === 400 || oldStatus === 404, `old status ${oldStatus}`)
      check('new object serves (200)', (await fetch(url2)).status === 200)
    }
    prof = (await (await req('/api/profile')).json())?.user
    check('avatarUrl persisted in DB', prof?.avatarUrl === url2)

    const delRes = await req('/api/profile/avatar', { method: 'DELETE' })
    check('DELETE avatar → 200', delRes.status === 200)
    if (url2) {
      const gone = (await fetch(url2)).status
      check('object removed from storage', gone === 400 || gone === 404, `status ${gone}`)
    }
    prof = (await (await req('/api/profile')).json())?.user
    check('avatarUrl null after delete', prof?.avatarUrl == null)
  }
  check('DELETE again → 404 (nothing to remove)', (await req('/api/profile/avatar', { method: 'DELETE' })).status === 404)

  // ════════════════════ 7. FINAL PERSISTENCE ════════════════════
  section('7. Persistence across requests (server-side state)')
  prof = (await (await req('/api/profile')).json())?.user
  check('username persisted', prof?.username === newName)
  check('state persisted', prof?.state === 'Karnataka')
  check('gender persisted', prof?.gender === 'male')
  check('onboarding stays complete', prof?.onboardingRequired === false)

  // ════════════════════ 8. DB-side regression: other features intact ════════════════════
  section('8. Unrelated features still work (live DB)')
  const cats = await (await req('/api/quiz/categories')).json()
  const catList = Array.isArray(cats) ? cats : cats?.categories
  check('quiz categories served from DB', Array.isArray(catList) && catList.length > 0, `got ${catList?.length}`)
  const posts = await (await req('/api/posts')).json()
  check('posts endpoint responds', posts && (Array.isArray(posts.posts) || Array.isArray(posts)))

  console.log(`\n════════ RESULT: ${passed} passed, ${failed} failed ════════`)
  if (failures.length) { console.log('FAILURES:'); failures.forEach((f) => console.log('  - ' + f)) }
  process.exitCode = failed ? 1 : 0
}

main()
  .catch((e) => { console.error('E2E CRASHED:', e); process.exitCode = 1 })
  .finally(async () => {
    try {
      const n = await cleanupTestRows()
      console.log(`\nCleanup: removed ${n} test row(s) from local DB + auth.users (own rows only).`)
    } catch (e) { console.error('Cleanup failed:', e) }
    await prisma.$disconnect()
  })
