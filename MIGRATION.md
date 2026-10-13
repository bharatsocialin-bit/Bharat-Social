# BharatSocial — Database Migration Guide

## Current State

- **Database engine**: SQLite (local file at `db/custom.db`)
- **Prisma version**: 6.19.2
- **Prisma provider**: `sqlite`
- **Migration strategy**: `prisma db push` (no tracked migrations yet)
- **Existing records**: 1 user, 1 post, 1 like (test data from Part 2)
- **NEXTAUTH_SECRET**: Rotated (old value was committed to git history — see below)

## Production Target

- **Database engine**: PostgreSQL (required for Vercel/serverless deployment)
- **Prisma provider**: `postgresql`
- **Migration strategy**: `prisma migrate dev` (tracked, version-controlled migrations)

## Migration Steps

### Step 1: Install and Create PostgreSQL

If you don't have PostgreSQL installed:

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian:**
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Or use Docker:**
```bash
docker run --name bharatsocial-db -e POSTGRES_PASSWORD=yourpassword -e POSTGRES_DB=bharatsocial -p 5432:5432 -d postgres:16
```

Create the database (if not using Docker which creates it automatically):
```bash
psql -U postgres -c "CREATE DATABASE bharatsocial;"
```

### Step 2: Update Environment Variables

Edit `.env`:
```env
# Point DATABASE_URL to PostgreSQL:
DATABASE_URL="postgresql://username:password@localhost:5432/bharatsocial"

# Generate a strong NEXTAUTH_SECRET (DO NOT reuse the old one):
# Run: openssl rand -base64 32
NEXTAUTH_SECRET="your-new-strong-secret"

NEXTAUTH_URL="http://localhost:3000"

# Keep SQLITE_URL pointing to the SQLite file for the migration script:
SQLITE_URL="file:./db/custom.db"
```

### Step 3: Update Prisma Provider

Edit `prisma/schema.prisma`, change the provider:
```prisma
datasource db {
  provider = "postgresql"  // was "sqlite"
  url      = env("DATABASE_URL")
}
```

### Step 4: Create Tracked Migrations

**Prisma version 6.19.2** — use `migrate dev` (not `migrate save` which was the old command):

```bash
# Generate the initial migration and apply it to PostgreSQL:
bunx prisma migrate dev --name init

# This will:
# 1. Create prisma/migrations/ directory with SQL files
# 2. Apply the migration to the PostgreSQL database
# 3. Regenerate the Prisma client
# 4. Create a migration lock file
```

### Step 5: Migrate Existing Data from SQLite

```bash
# Run the migration script to transfer SQLite records to PostgreSQL:
bun run scripts/migrate-sqlite-to-postgres.ts
```

The script:
- Reads all 7 tables from SQLite (Users, Posts, Comments, Likes, Bookmarks, Follows, Notifications)
- Inserts them into PostgreSQL in foreign-key order: Users → Posts → Comments → Likes → Bookmarks → Follows → Notifications
- Preserves original IDs, timestamps, and all field values
- Skips records that already exist (idempotent — safe to re-run)
- Reports record counts before and after
- Does NOT modify or delete the SQLite database
- Errors are logged without leaking connection strings or credentials

### Step 6: Verify

```bash
# Verify the Prisma client connects to PostgreSQL:
bunx prisma studio

# Run the app and test:
bun run dev

# Check that existing records are accessible:
curl http://localhost:3000/api/posts
```

### Step 7: Commit Migrations

```bash
git add prisma/migrations/
git commit -m "chore: add PostgreSQL tracked migrations"
```

**DO NOT commit `.env`** — it is in `.gitignore` and must stay excluded.

## Schema Compatibility

The Prisma schema is fully compatible with both SQLite and PostgreSQL:

| Feature | SQLite | PostgreSQL | Notes |
|---------|--------|------------|-------|
| `@id @default(cuid())` | ✅ | ✅ | String IDs work identically |
| `@unique` | ✅ | ✅ | Unique constraints work |
| `@@unique([a, b])` | ✅ | ✅ | Composite unique works |
| `@@index([field])` | ✅ | ✅ | Indexes work |
| `onDelete: Cascade` | ✅ | ✅ | Cascade deletes work |
| `String?` (nullable) | ✅ | ✅ | Nullable fields work |
| `@default(now())` | ✅ | ✅ | Timestamp defaults work |
| `@updatedAt` | ✅ | ✅ | Auto-update timestamps work |

## Git History — Exposed Secret

The old `.env` file (containing the old NEXTAUTH_SECRET) was committed in 3 commits before being removed from tracking. The old secret has been **rotated** — a new strong secret was generated locally and the old value is no longer in use.

However, the old secret is still accessible in git history. If this repository will be made public:

1. **Rotate the secret** (already done — the new `.env` has a different value)
2. **Clean git history** (optional, recommended for public repos):
   ```bash
   # Using git filter-repo (recommended):
   pip install git-filter-repo
   git filter-repo --invert-paths --path .env

   # Or using BFG Repo-Cleaner:
   bfg --delete-folders .env --no-blob-protection
   git reflog expire --expire=now --all && git gc --prune=now
   ```
3. **Force push** the cleaned history (coordinate with all collaborators first)

**Do NOT rewrite git history** without first confirming the repository backup status and coordinating with all collaborators.

## Local Development

Developers can continue using SQLite locally:

```env
# .env for local development:
DATABASE_URL="file:./db/custom.db"
NEXTAUTH_SECRET="generate-your-own-dev-secret"
NEXTAUTH_URL="http://localhost:3000"
SQLITE_URL="file:./db/custom.db"
```

Use `bunx prisma db push` for local schema sync (fast, no migration tracking needed for dev).

For production, use `bunx prisma migrate deploy` (applies tracked migrations only, no interactive prompts).

## Production Checklist

- [ ] PostgreSQL database created
- [ ] `DATABASE_URL` points to PostgreSQL (not SQLite)
- [ ] `provider = "postgresql"` in schema.prisma
- [ ] `bunx prisma migrate dev --name init` completed
- [ ] Migration script run successfully (`bun run scripts/migrate-sqlite-to-postgres.ts`)
- [ ] Record counts match before/after
- [ ] `NEXTAUTH_SECRET` is a strong random value (not the old dev placeholder)
- [ ] `.env` is NOT committed to version control (verified by `.gitignore`)
- [ ] `prisma/migrations/` directory is committed to version control
- [ ] Old secret in git history has been rotated (done) or history cleaned (if going public)
