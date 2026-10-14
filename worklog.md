# BharatSocial Worklog

---
Task ID: 25
Agent: Super Z (main)
Task: Production readiness audit (AUDIT ONLY — no modifications, per user instruction).

Work Log:
- DISCOVERED: container workspace was WIPED between sessions. /home/z/my-project now contains only a fresh platform scaffold (commits 0673aa1 Initial commit + 2 platform UUID commits). package.json, prisma/, src/, worklog.md, scripts/, real .env, ~/.git-credentials ALL GONE.
- Survivors: upload/ (original zip + screenshots), download/, skills/.
- Production NOT affected: Vercel site live (home 200, /api/quiz/categories serves DB data, oauth start 307). Supabase alive.
- GitHub repo publicly readable; HEAD = 310efe8 (latest work: PUBLIC_ORIGIN override). Full history intact.
- Cloned repo read-only to audit-clone/ for inspection. 236 files, 54 API routes, 25 Prisma models (postgresql).
- Interim platform commits dfbcd84/68ff4fe only added worklog.md + scripts/verify-vercel-prod.mjs (harmless).
- Build config: Next 16.1.3 Turbopack, bun, build=next build + standalone cp (Ready on Vercel), no middleware.ts (per-route auth), no prisma generate in build (relies on @prisma/client postinstall).
- Auth: getCurrentUser() treats suspended as null (central enforcement); requireAdmin() on 15/15 admin routes; 19/19 non-admin write routes call getCurrentUser (only /register public by design).
- Auth flows verified in code: register (Supabase-first, P2002 race handling, emailConfirmationRequired flag), login (suspended check, Supabase signInWithPassword first, bcrypt legacy fallback), supabase-token provider (suspended refusal), resolveIdentity (id match -> email link -> create unique username).
- Secrets: .env untracked (only .env.example), zero hardcoded secrets, zero service_role usage. NEXTAUTH_SECRET rotated before first push (never in history).
- tsc --noEmit: CLEAN. eslint: CLEAN on HEAD 310efe8.
- Live probes (unauthenticated): posts/search/pulse/quiz/shorts/badges = 200; notifications/profile = 401; admin/* = 403. Auth + admin gates verified in production.
- Live evidence of Supabase Site URL = http://localhost:3000: user's error-page URL was http://localhost:3000/?code=5d7f9045-... (bare root + code = Site URL fallback, NOT our /api/auth/supabase-callback).
- Known gaps found: password reset NOT implemented; no rate limiting on /register + auth endpoints; no CSP headers; .env.example stale (still says SQLite active, calls NEXTAUTH_SECRET "local dev only", mentions unused SERVICE_ROLE key); prisma/migrations/ gitignored (db push workflow, no versioned migrations -> drift risk); db:reset script = destructive footgun against prod DATABASE_URL; no admin bootstrap (role must be set via SQL); Supabase Auth orphan risk if local create fails after signUp (documented, P2002 mitigates).
- Jobs / Groups / Marketplace: NOT implemented (no routes, no views). All existing UI views have backing APIs (SPA: page.tsx swaps feed/pulse/shorts/quiz/badges/admin/profile views).

Stage Summary:
- Production is UP and healthy for anonymous + email/bcrypt use; the user-visible breakage is Google OAuth completion -> localhost, root-caused to Supabase Site URL config (+ possibly stale NEXTAUTH_URL on Vercel, unconfirmed).
- #1 operational blocker: local dev workspace wiped; recovery = clone from GitHub (public, no auth needed for read) + restore .env + re-add GitHub PAT for push.
- Audit delivered to user; NO files modified, NO pushes, NO DB changes (read-only clone + HTTP GET probes only).
- Open user actions pending: Supabase Site URL change, Confirm-email toggle, NEXTAUTH_URL verification, bharatsocial.in registration completing at Hostinger.

---
Task ID: 26
Agent: Super Z (main)
Task: Complete profile setup and profile editing system (user-approved feature work).

Work Log:
- RESTORED workspace: /home/z/my-project was a fresh platform scaffold (wipe between sessions). Copied audit-clone (clean GitHub clone @310efe8) into project root incl. .git; platform infra kept (Caddyfile mode-only diff, .zscripts, dev.log). Reconstructed .env with recoverable values (NEXTAUTH_SECRET, NEXT_PUBLIC_SUPABASE_URL); ANON KEY + DATABASE_URL + SERVICE ROLE were lost with the wipe and are NOT recoverable from the deployed bundle (client never imports them; oauth redirect carries no apikey).
- SCHEMA (additive only): User += avatarUrl?, dateOfBirth?, gender?, links (JSON default "[]", max 4), onboardedAt?. scripts/profile-migration.sql = full SQL-editor path (columns + backfill onboardedAt=createdAt for existing rows + avatars bucket 5MB/image-only + owner-scoped RLS policies).
- VALIDATION LIB: src/lib/profile.ts (username 3-30 [a-zA-Z0-9_] + reserved list + lowercase, bio 200, links <=4 http/https order-preserving, gender allowlist, DOB 13-120 with policy reason, isOnboardingRequired). 41 unit tests green (scripts/test-profile-validation.ts).
- STORAGE: src/lib/supabase/storage.ts — 3-path resolution: SERVICE_ROLE_KEY admin (bucket auto-ensure) → sb-* cookie session (Google users, RLS folder=auth.uid()) → NextAuth-JWT-stashed SB tokens (email users; silent refreshSession retry). Magic-byte sniffing (jpeg/png/webp/gif), 5MB cap, per-user folder from SESSION only, orphan cleanup on replace/remove, avatarUrl tamper guard (objectPathFromPublicUrl validates bucket prefix).
- AUTH: credentials authorize now returns sb tokens on Supabase password login; jwt callback persists them; session callback does NOT leak them. getToken via next-auth/jwt.
- APIS: GET/PATCH /api/profile (own incl. onboardingRequired; public ?id=/?username= via shared profile-server builder); POST/DELETE /api/profile/avatar; GET /api/profile/check-username; /api/users/[username] delegates to shared builder; register uses shared validator + sets onboardedAt; posts/comments APIs pass avatarUrl through. PATCH is whitelist-only — role/email/ids/suspension unread.
- UI: OnboardingGate wraps both page.tsx returns (incl. shorts takeover); OnboardingView (mobile-first, required username w/ debounced availability, prefilled, optional everything else); EditProfileView (live preview, photo upload/replace/remove, links add/edit/reorder/remove, loading/success/failure states); ProfileView rewritten (real data via ?id= with u-current remap, photo/bio/state/links/counts/API posts, real follow toggle, Edit button); UserAvatar renders photo w/ gradient fallback; store += editProfileOpen.
- VERIFIED: tsc clean, eslint clean, 41/41 unit tests, dev server compiles, agent-browser smoke (home 200 desktop+mobile, demo profile renders, zero console errors, anonymous UX unchanged). NOT verifiable in sandbox: authenticated flows + real uploads (no DATABASE_URL / anon key locally; Vercel prod HAS them).

Stage Summary:
- Branch feature/profile-system, 5 commits: bb2d5fc, 4fd86e0, 616e97a, 9450911, 09ec019. NOT pushed (PAT wiped) — needs user PAT; do NOT merge to main until user approves (push to main = production deploy).
- ACTIVATION for the user: (1) run scripts/profile-migration.sql in Supabase SQL editor (or bunx prisma db push with DATABASE_URL); (2) add SUPABASE_SERVICE_ROLE_KEY to Vercel + local .env for guaranteed avatar storage (or run the SQL policies and use cookie/token paths); (3) restore local .env (anon key + DATABASE_URL) to dev-test in sandbox; (4) provide PAT to push branch → Vercel preview.
