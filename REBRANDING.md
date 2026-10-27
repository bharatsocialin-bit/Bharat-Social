# Desily Rebranding — Domain Update Checklist

This document tracks everything that needs to change **when you secure the new domain**. Until then, the current Vercel deployment (`https://bharat-social-mu.vercel.app`) keeps working — no domain settings were touched in this rebranding commit.

## Current state (post-rebrand)

| Item | Value | Status |
|------|-------|--------|
| Public brand name | Desily | ✅ Updated everywhere user-facing |
| Tagline | One India. Every Voice. | ✅ Kept |
| Logo | New Desily mark (saffron bar + navy arc + green dot) | ✅ Multiple variants in `/public` |
| PWA manifest | `desily` short_name, navy theme | ✅ `/public/manifest.webmanifest` |
| Production URL | `https://bharat-social-mu.vercel.app` | ⚠️ Unchanged (no new domain confirmed yet) |
| GitHub repo | `bharatsocialin-bit/Bharat-Social` | ⚠️ Unchanged (rename via GitHub Settings → Repository name when ready) |
| Supabase project URL | unchanged | ⚠️ (Project name is internal-only; not user-visible) |
| Prisma schema / DB models | unchanged | ✅ Per spec — internal identifiers preserved |
| API routes (`/api/...`) | unchanged | ✅ Per spec |
| Environment variable keys | unchanged | ✅ Per spec |
| Reserved usernames list | `bharatsocial*` (defensive) + `desily*` (new) | ✅ Both retained |

## When the new domain is confirmed, update these locations

### 1. Vercel (DNS + project settings)
- [ ] Buy / register the new domain at your registrar (e.g. desily.in, desily.com, etc.)
- [ ] In Vercel dashboard → **Bharat-Social** project → **Settings → Domains**
  - [ ] Click **Add** → enter the new domain → select "Add"
  - [ ] Vercel shows DNS records (A record / CNAME) to add at your registrar
  - [ ] Add the DNS records at the registrar
  - [ ] Wait for DNS propagation (usually <5 minutes; can take up to 24h)
  - [ ] Vercel validates the DNS — once "Valid Configuration" shows, the domain is live
- [ ] (Optional but recommended) Mark the new domain as **Primary**
- [ ] (Optional) Remove `bharat-social-mu.vercel.app` if you no longer want the Vercel subdomain accessible — but **leave it active during the migration window** so old links keep working

### 2. Supabase (Auth redirect URLs)
- [ ] Supabase dashboard → **Authentication → URL Configuration**
  - [ ] **Site URL**: change from `https://bharat-social-mu.vercel.app` to `https://<new-domain>`
  - [ ] **Redirect URLs**: add `https://<new-domain>/api/auth/supabase-callback` (keep the old one too during the transition)
- [ ] This is the #1 root-cause of OAuth-completion bugs in the worklog (Task 25) — verify carefully

### 3. Google OAuth (Google Cloud Console)
- [ ] https://console.cloud.google.com/apis/credentials → your OAuth 2.0 Client ID
  - [ ] **Authorized JavaScript origins**: add `https://<new-domain>`
  - [ ] **Authorized redirect URIs**: add `https://<new-domain>/api/auth/supabase-callback`
  - [ ] Keep the old `https://bharat-social-mu.vercel.app` entries during the transition

### 4. NextAuth (Vercel env vars)
- [ ] Vercel → Project → **Settings → Environment Variables**
  - [ ] `NEXTAUTH_URL` → update to `https://<new-domain>` (if set; otherwise leave unset and NextAuth auto-detects from request)
- [ ] Pull the change locally: `vercel env pull .env.local` or set it in your local `.env`

### 5. Link preview User-Agent (code change)
- [ ] `src/lib/pulse/link-preview.ts` line 99 — the User-Agent string currently contains `+https://bharat-social-mu.vercel.app`. Update to `+https://<new-domain>` so external sites see the correct origin in their access logs.

### 6. PWA manifest (optional — start_url is relative)
- [ ] `/public/manifest.webmanifest` already uses `"start_url": "/"` (relative). No change needed — it will resolve to whichever domain the app is served from.
- [ ] If you want to add the domain explicitly (e.g. for `scope`), you can — but it's not required.

### 7. Open Graph metadata (already neutral)
- [ ] `src/app/layout.tsx` `metadata.openGraph.url` is **deliberately omitted** so OG consumers fall back to the request URL. When the domain is confirmed, you can add `url: "https://<new-domain>"` for stricter canonical tagging. Optional, not required.

### 8. Production verification
- [ ] Visit `https://<new-domain>` — confirm logo loads, fonts render, no console errors
- [ ] Visit `https://<new-domain>/api/pulse/trending` — should return 200 JSON
- [ ] Sign out and sign back in via Google OAuth — confirm redirect completes (this is the Supabase Site URL test)
- [ ] Sign out and sign back in via email/password — confirm NextAuth round-trip works
- [ ] On mobile (Chrome Android or Safari iOS): "Add to Home Screen" — confirm the Desily icon and name appear (PWA manifest test)

### 9. Optional cleanup (after the new domain has been live for 1+ week with no issues)
- [ ] Rename GitHub repo: `Bharat-Social` → `desily` (Settings → Repository name). The old URL `bharatsocialin-bit/Bharat-Social` will automatically redirect.
- [ ] Update local remote: `git remote set-url origin https://github.com/bharatsocialin-bit/desily.git`
- [ ] Optionally rename the GitHub user/org if appropriate (separate decision)
- [ ] Optionally rename the Vercel project (Settings → General → Project Name). Vercel will keep the old `bharat-social-mu.vercel.app` subdomain working.
- [ ] Optionally rename the Supabase project (Project Settings → General → Name). Internal-only; doesn't affect any URL.
- [ ] Remove the defensive `bharatsocial*` reserved usernames from `src/lib/profile.ts` if you no longer need them — but keeping them costs nothing and is safer.

## What was deliberately NOT changed (per spec)

The user explicitly said: *"Do not rename database models, API routes, internal identifiers, or authentication providers solely because the public brand changes."*

Therefore the following **internal technical identifiers are intentionally unchanged**:

- Prisma models: `User`, `Post`, `UserStory`, `PulseStory`, `Short`, `QuizQuestion`, etc.
- API routes: `/api/pulse/stories/user/...`, `/api/profile/avatar`, `/api/admin/...`, etc.
- Env var keys: `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `DATABASE_URL`, etc.
- Auth provider IDs: `next-auth`, `credentials`, `supabase-token`, etc.
- Supabase project URL and DB connection string
- GitHub repo name (`Bharat-Social`) — can be renamed later, see §9
- Vercel project name (`Bharat-Social`) — can be renamed later, see §9
- Existing production URL `https://bharat-social-mu.vercel.app` — kept working during rebrand

These will continue to function identically before, during, and after the rebrand. No data migration, no DB reset, no breaking changes.

## Files changed in this rebrand commit

See the commit message for the full file list. Summary:
- **Logo assets** (new): `public/desily-icon.svg`, `public/desily-icon-mono.svg`, `public/desily-logo.svg`, `public/desily-logo.png`, `public/desily-icon-192.png`, `public/desily-icon-512.png`, `public/apple-touch-icon.png`, `public/favicon.svg`, `public/manifest.webmanifest`
- **Branding text updates**: `src/app/layout.tsx` (metadata), `src/app/globals.css` (comment), `src/components/social/Logo.tsx`, plus user-facing strings in `MobileHeader`, `NavPanel`, `RightSidebar`, `HomePage`, `Feed`, `ProfileView`, `OnboardingView`, `ProfileOptionalFields`, `PulseAbout`, `ResultsScreen`, `ShortsView`, `ShortsUploadDialog`, `AuthDialog`
- **Defensive reserved usernames**: `src/lib/profile.ts` (kept `bharatsocial*`, added `desily*`)
- **Comments**: `src/lib/types.ts`, `src/data/shorts.ts`, `src/data/users.ts`, `src/app/api/quiz/attempts/route.ts`, `prisma/schema.prisma`, `.env.example`
- **User-Agent string** (link preview): `src/lib/pulse/link-preview.ts`
- **Asset generator**: `scripts/generate-desily-pngs.mjs` (one-off script — re-run if logo SVG changes)
- **This checklist**: `REBRANDING.md` (new)
