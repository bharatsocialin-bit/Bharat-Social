# BharatSocial — Phase 1 Full Platform Readiness Audit

**Date:** 2026-10-11
**Scope:** Authentication, authorization, social features, admin moderation, India Pulse, Shorts, India Quiz, DB integrity, UI, env/security configuration.
**Method:** Static code review of all `src/app/api/**` routes + `src/lib/**` + `prisma/schema.prisma` + `.env` + `next.config.ts` + selected UI components. Existing test suites re-run after each fix.

---

## CRITICAL (block first-user test)

### C1. Hardcoded fallback JWT secret — `src/lib/auth/authOptions.ts:67`
**Evidence:** `secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production'`. The `.env` file does NOT define `NEXTAUTH_SECRET`, so the running server uses the literal string `'dev-secret-change-in-production'` which is publicly visible in source code.
**Impact:** Anyone who reads the repo can forge a valid NextAuth JWT for ANY user (including admins), bypassing password authentication entirely. This is the most severe finding — full authentication bypass.
**Fix:** Remove the fallback so the app refuses to start if `NEXTAUTH_SECRET` is missing. Add the env var to `.env` with a strong random value. Add `.env.example` documenting required env vars. Add a regression test verifying the server refuses to boot without it.

### C2. Registration TOCTOU race — `src/app/api/register/route.ts:38-65`
**Evidence:** The endpoint does `findUnique({where:{email}})` then `findUnique({where:{username}})` then `db.user.create()`. Two concurrent requests with the same email/username can both pass the existence check and the second `create` will throw an unhandled Prisma unique-constraint error → caught by the outer try/catch and returned as a generic 500.
**Impact:** (a) Duplicate-user race condition returns wrong status code (500 instead of 409). (b) The generic 500 message hides the underlying duplicate-key reason from the legitimate user.
**Fix:** Catch Prisma `P2002` unique-constraint error after `user.create()` and return 409 with the specific field that collided. Wrap the create in try/catch keyed on the Prisma error code.

### C3. Story audit log writes to wrong FK column — `src/app/api/admin/stories/route.ts:99-103` and `src/app/api/admin/stories/[id]/route.ts:62-66, 109-113`
**Evidence:** All story-related `ModerationAction` records set `targetReportId: story.id` (a PulseStory ID, NOT a Report ID) and use `action: 'story_created' / 'story_status_changed' / 'story_deleted'` which are NOT in the schema's documented enum.
**Impact:** (a) The audit log's `targetReportId` column now contains foreign-key-like values that don't correspond to actual Report rows — anyone querying "show me the report tied to this moderation action" will get a 404. (b) Schema/implementation drift: future migrations to a strict enum (Postgres) would silently break these inserts. (c) Admins cannot filter the audit log by `action='story_*'` because the schema doesn't advertise these values.
**Fix:** Add a `targetStoryId String?` column to `ModerationAction` in `schema.prisma` and update the schema's action comment to include `'story_created'`, `'story_status_changed'`, `'story_deleted'`. Update the three story admin routes to write `targetStoryId` instead of `targetReportId`. Add an audit-log filter test.

### C4. `JSON.parse(story.postIds)` can crash public API routes — `src/app/api/pulse/stories/route.ts:38`, `src/app/api/pulse/stories/[id]/route.ts:18,65`, `src/app/api/admin/stories/route.ts:38`
**Evidence:** All four call sites do `JSON.parse(s.postIds)` without try/catch. The field has a default of `"[]"` but is a free-form `String`, and the admin create route writes `JSON.stringify(postIds || [])` where `postIds` could be anything the admin client sends (e.g. `null`, a non-array object, or an array containing non-strings).
**Impact:** A single malformed `postIds` value in the DB (or one malicious admin POST) crashes the public `/api/pulse/stories` endpoint with an unhandled exception → 500 for every visitor. Also the admin list route crashes for every admin.
**Fix:** Replace all 4 call sites with a `safeParsePostIds(s.postIds)` helper that returns `string[]` and logs/warns on parse failure. Validate `postIds` server-side in the admin create/update routes: must be array of strings, each ≤100 chars, max 50 entries.

---

## HIGH (must fix before first real user)

### H1. User-delete is hard-delete, not soft-delete — `src/app/api/posts/[id]/route.ts:31`
**Evidence:** When a user deletes their OWN post, `db.post.delete({where:{id}})` removes the row entirely. The schema has a `deletedAt` field intended for soft-delete, but it's only used by the admin delete route. The user delete route bypasses it.
**Impact:** (a) The post's likes/comments/reposts/reports cascade-delete too, permanently destroying audit data. (b) If a user deletes a post that's under active review, the report becomes orphaned (`postId` still points at it via `onDelete: Cascade` → report is silently deleted). (c) Users cannot undo their own deletion.
**Fix:** Change user-delete to soft-delete: set `deletedAt = new Date()` and exclude soft-deleted posts from the feed. Existing `db.post.findMany({where:{deletedAt:null}})` already filters them. Add a regression test confirming the post row persists after user delete.

### H2. Repost on soft-deleted post allowed — `src/app/api/posts/[id]/repost/route.ts:19-22`
**Evidence:** The route only checks `findUnique({where:{id}})` without filtering `deletedAt:null`. A user can repost a soft-deleted post, which then appears in their profile/reposts list pointing at content that's no longer visible.
**Impact:** Confusing UX, potential abuse vector for surfacing moderated-out content.
**Fix:** Add `deletedAt: null` to the post lookup filter. Same for the comment route (`src/app/api/posts/[id]/comments/route.ts:29`) which has the same gap.

### H3. Bookmark on deleted/nonexistent post allowed — `src/app/api/posts/[id]/bookmark/route.ts:18-26`
**Evidence:** No existence or soft-delete check at all — the `findUnique` for an existing bookmark succeeds, but on first bookmark the route calls `db.bookmark.create({data:{postId,userId}})` which will fail with a Prisma FK error if the post doesn't exist, returning a generic 500. Worse, soft-deleted posts can still be bookmarked.
**Impact:** Bad UX (bookmark silently persists on moderated-out content), generic 500 error on edge case.
**Fix:** Add a `findUnique({where:{id, deletedAt:null}})` check; return 404 if not found.

### H4. Block does not block follow / like / comment / repost from the blocked user — `src/app/api/follow/route.ts`, `src/app/api/posts/[id]/like/route.ts`, `src/app/api/posts/[id]/comments/route.ts`, `src/app/api/posts/[id]/repost/route.ts`
**Evidence:** None of these routes consult the Block table. If Alice blocks Bob, Bob can still like Alice's posts (creating a notification for Alice), comment on Alice's posts (creating a notification AND surfacing his content on her post), repost Alice's posts, and follow Alice.
**Impact:** Block is a safety feature — users rely on it to stop harassment. The current implementation only filters blocked users' content OUT of the blocker's view; it does NOT stop the blocked user from generating new notifications against the blocker.
**Fix:** Add a `checkBlock(currentUser.id, targetUserId)` helper. Use it in: like (check `post.authorId`), comment (check `post.authorId`), repost (check `post.authorId`), follow (check `targetUserId`). Return 403 with a generic message when blocked.

### H5. `GET /api/shorts` does NOT actually filter suspended users' shorts — `src/app/api/shorts/route.ts:34-41`
**Evidence:** The route's comment says "Exclude shorts by suspended users" but the `where` clause only has `deletedAt: null, moderationStatus: 'active'`. There is no `creator: { suspended: false }` filter (the `Short.creator` relation is `select`ed, not `where`-filtered).
**Impact:** Shorts by suspended users remain in the public feed. The trending route (`/api/pulse/trending/route.ts:58`) DOES filter them via post-filter, but Shorts does not. Inconsistency + security gap.
**Fix:** Either (a) filter via `creator: { suspended: false }` in the where clause (Prisma nested filter), or (b) post-filter the result list the same way trending does. Approach (a) is more efficient.

### H6. Profile PATCH does not validate field types — `src/app/api/profile/route.ts:124-149`
**Evidence:** The route accepts `name, bio, state, city, avatarGradient, initials` from the JSON body, only checks `length` on string fields. If a client sends `bio: {evil: "object"}` or `bio: ["array"]`, the `.length > 500` check is `undefined > 500 = false`, so the object passes through and gets stored as-is. Same for `avatarGradient` and `initials` — no validation at all (no allowed-values whitelist).
**Impact:** (a) DB integrity: non-string values silently stored. (b) `avatarGradient` is interpolated into a `className` attribute in `PostCard`/`UserAvatar` — a malicious user could set it to an arbitrary long string of classes that breaks layout, or use it to disguise their avatar (e.g. `bg-red-500` to fake a verified badge). Not a script injection (React escapes), but a presentation/security-trust issue.
**Fix:** Add `typeof === 'string'` checks for each field. Add an `ALLOWED_GRADIENTS` whitelist for `avatarGradient`. Add a length cap (≤2 chars) and alphanumeric-only check for `initials`.

### H7. `GET /api/users/[username]` exposes soft-deleted post counts + suspended-user profiles — `src/app/api/users/[username]/route.ts:17-37, 119`
**Evidence:** (a) `postsCount: user._count.posts` counts ALL posts by the user (including soft-deleted ones, because `_count.posts` doesn't apply a `deletedAt:null` filter). (b) The user lookup has no `suspended: false` filter, so a suspended user's profile (bio, location, follower counts, posts) is fully public.
**Impact:** (a) Leak of moderation activity — visitors can deduce how many posts an admin removed from a user. (b) Suspended users should be hidden or minimally-marked; showing their full profile + posts undermines the suspension.
**Fix:** (a) Count posts via a separate `db.post.count({where:{authorId:user.id, deletedAt:null}})`. (b) Add `suspended: false` to the user lookup OR return a minimal "user suspended" payload. Also add the same fix to `GET /api/profile?username=xxx` (`src/app/api/profile/route.ts:20-40`).

### H8. Notifications capped at 20 with no pagination — `src/app/api/notifications/route.ts:13-28`
**Evidence:** `take: 20` with no `cursor`/`skip`/`page` parameter. A user with >20 notifications can never see older ones. There's no `nextCursor` in the response.
**Impact:** Data loss — users lose access to historical notifications (e.g. "who liked my post last week"). Engagement loss — no way to scroll back through activity.
**Fix:** Add cursor-based pagination mirroring `/api/posts` (take+1, cursor+skip:1 pattern). Accept `cursor` query param. Return `nextCursor` in the response.

### H9. `db.ts` enables `log: ['query']` in development — `src/lib/db.ts:9-11`
**Evidence:** `new PrismaClient({log: ['query']})` logs every SQL query to console. The dev server output (visible in `dev.log`) contains every SELECT/INSERT including user IDs, email values, password hashes (during auth), and badge progress.
**Impact:** (a) Massive log noise. (b) Sensitive data exposure in dev.log — if dev.log is ever uploaded as a "debug artifact" by a developer, it leaks user data including hashed passwords (during the bcrypt compare lookup). (c) Performance: synchronous logging slows down every request.
**Fix:** Change to `log: ['error', 'warn']`. If query logging is genuinely needed for local debugging, gate it behind an explicit `DEBUG_PRISMA=1` env var.

### H10. `NEXTAUTH_URL` not set — `.env`
**Evidence:** Only `DATABASE_URL` is defined. `authOptions.ts` does not set `NEXTAUTH_URL`, and NextAuth v4 will try to auto-detect it but can fail behind proxies/Caddy (which the project uses — see `Caddyfile`).
**Impact:** Auth callback URLs can be miscomputed on the production-shaped local setup, breaking login redirects or producing "URL host not trusted" errors.
**Fix:** Add `NEXTAUTH_URL=http://localhost:3000` to `.env` and document it in `.env.example`.

---

## MEDIUM (fix before broad rollout, can ship to first-user with notes)

### M1. `reactStrictMode: false` — `next.config.ts:3`
**Evidence:** React Strict Mode is disabled. Strict Mode intentionally double-invokes effects/state updaters in dev to surface bugs (e.g. stale-closure state, missing cleanups). Disabling it means these bugs ship undetected.
**Impact:** Latent effect-cleanup bugs in `ShortCard`'s IntersectionObserver, `QuizView`'s timer, etc. won't be caught.
**Fix:** Set `reactStrictMode: true`. Re-run all tests. Investigate any new warnings.

### M2. Prisma `db:push --accept-data-loss` in package.json scripts — `package.json:22`
**Evidence:** `"db:push": "prisma db push --accept-data-loss"`. The `--accept-data-loss` flag silently drops columns/tables when the schema changes. A developer running `bun run db:push` after a schema edit can wipe user data without warning.
**Impact:** Risk of accidental data loss during future schema iterations.
**Fix:** Remove `--accept-data-loss` from the script. Document the proper migration workflow (`bunx prisma migrate dev --name <change>`).

### M3. Quiz attempt route trusts client-supplied `questionIds` — `src/app/api/quiz/attempts/route.ts:178-208`
**Evidence:** The route fetches questions by `id: {in: questionIds}` and verifies `published:true` and category match — but it does NOT verify that the client actually fetched these IDs from `/api/quiz/questions` or `/api/quiz/daily`. A user could submit a daily challenge attempt with arbitrary published question IDs from any category (as long as `type:daily` and `refId:todayIst`).
**Impact:** A user can game the daily challenge by submitting with question IDs they already know the answers to (e.g. they played category quiz first to learn the answers, then submitted those same questions as their "daily"). Server-side scoring is still authoritative (correct/wrong is still computed server-side), but the daily challenge becomes trivially solvable.
**Fix:** For `type === 'daily'`, the server should resolve today's question IDs from `QuizDailySet` or the deterministic fallback (`/api/quiz/daily` logic) and IGNORE any `questionIds` the client sends. The client's `questionIds` field can be removed entirely from the request body for daily attempts.

### M4. `getCurrentUser` is imported but unused in `/api/quiz/questions/route.ts` — `src/app/api/quiz/questions/route.ts:3,157`
**Evidence:** `import { getCurrentUser } from '@/lib/auth/getCurrentUser'` followed by `void getCurrentUser;` to suppress the unused-import warning. Question fetching is intentionally public (anyone can read published questions). The import is dead code.
**Impact:** Confusing for future maintainers (looks like the route was supposed to require auth).
**Fix:** Remove the import and the `void getCurrentUser;` line.

### M5. Notification type union not enforced — `prisma/schema.prisma:158`
**Evidence:** Schema comment says `"follow" | "like" | "comment"` but the actual column is `String`. Multiple routes write `type: 'repost'` (`/api/posts/[id]/repost/route.ts:41`, `/api/shorts/[id]/repost/route.ts:46`, `/api/shorts/[id]/like/route.ts:48` writes `type:'like'` with `postId:null` for shorts — that's also broken because the client can't link the notification to a short).
**Impact:** Notification UI can't reliably render a "repost" notification; shorts likes/comments show up as orphaned "like"/"comment" notifications with no post to link to.
**Fix:** (a) Update the schema comment to include `'repost' | 'short-like' | 'short-comment' | 'short-repost'`. (b) Add a `shortId String?` column to Notification so short notifications have a target. (c) Update the notification UI to render these types correctly. (This is a larger fix — at minimum document the gap.)

### M6. Profile PATCH allows setting `name` to empty string — `src/app/api/profile/route.ts:127-129`
**Evidence:** The check is `name !== undefined && name !== null && name.length > 100`. If `name = ""` (empty string), it passes the check and is written to the DB, blanking out the user's display name. The User schema has `name String?` (nullable), so null is allowed but empty string is nonsensical.
**Impact:** User can have a blank display name, breaking avatar initials and profile rendering.
**Fix:** Treat `name === ''` as null (set to null). Same for `bio`, `state`, `city`.

### M7. Admin story create uses `action: 'story_created'` not in schema enum — `src/app/api/admin/stories/route.ts:100`
**Evidence:** Same root cause as C3 — the action string isn't in the documented enum, AND `targetReportId` is being misused to hold a story ID.
**Impact:** See C3.
**Fix:** Same fix as C3 — covered together.

### M8. `/api/pulse/trending/route.ts` topic extraction is naive — `src/app/api/pulse/trending/route.ts:73-77`
**Evidence:** Topic extraction does `post.content.toLowerCase().replace(/[^\w\s#]/g, '').split(/\s+/).filter(w => w.length > 4)`. The stopword list is hardcoded and tiny (15 words). The first matching word becomes the "topic" — so two posts about "cricket world cup" will both be bucketed under "cricket" (good) but a post about "the prime minister" will be bucketed under "prime" or "minister" depending on order, and there's no stemming (running/runs/run are different topics).
**Impact:** Trending topics are noisy and unreliable. Not a security issue, but a quality issue that affects user trust in the feature.
**Fix:** Out of scope for this audit pass — document as known limitation. A proper fix requires a stemming library (e.g. `stemmer`) and a bigger stopword list.

### M9. `search` route uses `contains` without `mode: 'insensitive'` — `src/app/api/search/route.ts:40-67`
**Evidence:** On SQLite, Prisma's `contains` is case-insensitive by default. But the same code on PostgreSQL (the documented production target) would be case-sensitive without `mode: 'insensitive'`. The code is silently SQLite-only.
**Impact:** Search will silently break when migrated to Postgres — searching "modi" won't match "Modi".
**Fix:** Add `mode: 'insensitive'` to all `contains` filters. Prisma on SQLite ignores it; Postgres respects it.

---

## LOW (cleanup, polish, future hardening)

### L1. `next.config.ts` removed `ignoreBuildErrors` (good!) but `reactStrictMode: false` is unusual — see M1.

### L2. `.gitignore` correctly excludes `.env*` — verified.

### L3. No `.env.example` file present — see C1 fix.

### L4. `package.json` lists `@dnd-kit/core`, `@mdxeditor/editor`, `embla-carousel-react`, etc. that are not imported anywhere in `src/`. Dependency bloat increases install time and attack surface. Out of scope to clean up now.

### L5. `eslint.config.mjs` and `tsconfig.json` exist — lint and TypeScript already pass cleanly.

### L6. `scripts/` directory has 13 test scripts (test-quiz, test-shorts, test-badges, etc.) using `node:test`-style assertions via plain `console.log`. No CI runner. Each test script must be invoked manually. Out of scope to add a runner now.

### L7. `tests/` directory contains only shell scripts for runtime environments, not unit tests. The "tests" of this codebase are the `scripts/test-*.cjs` files.

### L8. `download/` directory has many screenshots from previous batches. Not a problem, just noting.

### L9. No CSP headers set in `next.config.ts` or middleware. Worth adding before broad rollout.

### L10. No rate limiting on `/api/register` or `/api/auth/callback/credentials`. A bot can spam account creation or password guesses. (bcrypt cost=10 slows brute-force but does not stop it.) Add `upstash/ratelimit` or similar before broad launch.

### L11. `Short` model has both `deletedAt` and `moderationStatus` — two ways to express "this short is gone". The semantics are different (deletedAt = creator removed it; moderationStatus='removed' = admin removed it) but the GET /api/shorts filter only checks both, which is correct. Just note the dual-state is a minor maintenance burden.

### L12. `QuizQuestion.createdBy` uses `onDelete: SetNull` but `QuizDailySet.createdBy` also uses `onDelete: SetNull`. Consistent. Good.

### L13. `ModerationAction.description` is capped at 500 chars in the schema comment but not enforced in code (the routes slice title via `title.slice(0, 40)` etc. so this is currently OK, but no validation).

---

## Summary by Audit Area

1. **Auth/sessions/password** — bcrypt cost=10 (acceptable), suspended enforcement at login + getCurrentUser (good). ❌ C1 hardcoded JWT secret.
2. **Admin authorization** — `requireAdmin()` enforced on every `/api/admin/*` route (verified all 13 routes). ✓
3. **User-owned resource authorization** — post delete checks ownership ✓; short delete checks ownership ✓; quiz attempt checks userId ✓. ✓
4. **Social features** — likes/comments/follows/blocks/reposts/search/notifications all exist. ❌ H1 (user-delete is hard-delete), H2 (repost on deleted post), H3 (bookmark on deleted post), H4 (block doesn't prevent new interactions), H8 (notifications cap), H5 (suspended shorts leak).
5. **Admin moderation** — soft-delete + audit log ✓; restore ✓; last-admin protection ✓; self-suspend blocked ✓. ❌ C3 (story audit logs miskeyed).
6. **India Pulse** — regional filter ✓; trending ✓ (with M8 caveat); stories CRUD ✓; evidence labels required for non-unverified ✓. ❌ C4 (JSON.parse crash), H5 (suspended shorts in feed).
7. **Shorts** — magic-byte validation ✓; size cap 50MB ✓; duration cap 180s (client-claimed, not server-verified — ffprobe mentioned in comment but not implemented); random filename ✓; path-traversal guard ✓; moderationStatus + deletedAt filters ✓. ⚠ Server-side duration verification via ffprobe is documented but NOT actually called in `saveVideoFile`. Document as unverified.
8. **India Quiz** — 1,001 questions verified ✓; 0 critical issues ✓; correct answer NEVER exposed pre-submit ✓; server-side scoring ✓; daily one-per-day atomic lock ✓; category rate limit ✓; achievements + badges idempotent ✓; streak IST-aware ✓. ❌ M3 (daily attempts trust client questionIds), M4 (dead import).
9. **DB integrity** — schema migrations clean ✓; cursor pagination on posts/shorts/admin-quiz-questions ✓; page-based pagination on reports/stories/users/regional ✓. ❌ H9 (Prisma query logging), M2 (db:push --accept-data-loss script).
10. **UI** — not deeply audited (would require browser automation). Lint passes. ✓ (with M1 caveat about StrictMode).
11. **Env/security** — `.gitignore` excludes `.env*` ✓; no `NEXTAUTH_SECRET` ❌ (C1); no `NEXTAUTH_URL` ❌ (H10); no `.env.example` ❌; no rate limiting on auth endpoints (L10).

---

## Findings Still Unresolved After This Pass

- M5 (notification type union): the schema comment + missing `shortId` column requires a schema migration with non-trivial backfill. Deferred.
- M8 (trending topic extraction): algorithmic quality issue, not security. Deferred.
- L4 (dependency bloat), L9 (CSP headers), L10 (rate limiting on auth): out of scope for this audit pass.
- Server-side ffprobe duration verification: documented in code comment but not implemented. Verified unimplemented — the `saveVideoFile` function does not invoke ffprobe.

## Existing Data Preservation

- All fixes applied via targeted edits to specific files. No DB reset, no schema-destructive migration.
- The C3 fix requires a non-destructive `prisma db push` to add `targetStoryId` column (nullable — existing rows are unaffected).
- Existing user (2), post (3), like (2), comment (1), report (1), moderation action (4), quiz question (1001), badge (33) rows are all preserved.
- Tests verified before and after each fix.
