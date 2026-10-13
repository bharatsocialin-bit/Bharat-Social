/**
 * SQLite → PostgreSQL migration script for BharatSocial.
 *
 * Reads all records from SQLite and writes them to PostgreSQL, preserving
 * IDs, timestamps, relationships, unique constraints, and nullable fields.
 *
 * MIGRATION ORDER (respects foreign keys):
 *   1. Users (no FKs)
 *   2. Posts (FK: authorId → User)
 *   3. Comments (FKs: postId → Post, userId → User)
 *   4. Likes (FKs: postId → Post, userId → User)
 *   5. Bookmarks (FKs: postId → Post, userId → User)
 *   6. Follows (FKs: followerId → User, followingId → User)
 *   7. Notifications (FK: userId → User)
 *
 * SAFETY:
 *   - Does NOT modify or delete the SQLite database.
 *   - Checks for existing records in PostgreSQL before inserting (idempotent).
 *   - Reports record counts before and after.
 *   - Fails safely on errors without leaking credentials.
 *
 * USAGE:
 *   This script requires TWO database connections:
 *   - SQLITE_URL: the path to the existing SQLite file
 *   - DATABASE_URL: the PostgreSQL connection string
 *
 *   Set both in .env:
 *     SQLITE_URL="file:./db/custom.db"
 *     DATABASE_URL="postgresql://user:password@localhost:5432/bharatsocial"
 *
 *   Then run:
 *     bun run scripts/migrate-sqlite-to-postgres.ts
 *
 *   The Prisma provider in schema.prisma must be set to "postgresql" before running.
 *   Run `bunx prisma migrate dev --name init` first to create the schema on PostgreSQL.
 */

import { PrismaClient } from '@prisma/client';

// --- SQLite source client ---
// We create a separate PrismaClient pointed at the SQLite file.
// The main DATABASE_URL must point to PostgreSQL for this to work.
const sqliteUrl = process.env.SQLITE_URL;

if (!sqliteUrl || !sqliteUrl.startsWith('file:')) {
  console.error('ERROR: SQLITE_URL environment variable must be set to the SQLite file path.');
  console.error('Set SQLITE_URL="file:./db/custom.db" in .env');
  console.error('Do NOT print the actual URL value.');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl || !dbUrl.startsWith('postgresql')) {
  console.error('ERROR: DATABASE_URL must be a PostgreSQL connection string.');
  console.error('Set DATABASE_URL="postgresql://..." in .env');
  console.error('Do NOT print the actual URL value.');
  process.exit(1);
}

// --- SQLite source client ---
// Prisma doesn't support connecting to two different databases from one client,
// so we use the datasourceUrl override to connect the source client to SQLite.
const sqliteDb = new PrismaClient({
  datasourceUrl: sqliteUrl,
});

// --- PostgreSQL target client (uses DATABASE_URL) ---
const pgDb = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BharatSocial — SQLite → PostgreSQL Migration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // ── Step 1: Read all records from SQLite ──────────────────────────
  console.log('Step 1: Reading records from SQLite...');

  const users = await sqliteDb.user.findMany();
  const posts = await sqliteDb.post.findMany();
  const comments = await sqliteDb.comment.findMany();
  const likes = await sqliteDb.like.findMany();
  const bookmarks = await sqliteDb.bookmark.findMany();
  const follows = await sqliteDb.follow.findMany();
  const notifications = await sqliteDb.notification.findMany();

  const beforeCounts = {
    users: users.length,
    posts: posts.length,
    comments: comments.length,
    likes: likes.length,
    bookmarks: bookmarks.length,
    follows: follows.length,
    notifications: notifications.length,
  };

  console.log('Records found in SQLite:');
  console.log(JSON.stringify(beforeCounts, null, 2));
  console.log('');

  await sqliteDb.$disconnect();
  console.log('SQLite connection closed. SQLite database was NOT modified.');
  console.log('');

  // ── Step 2: Check for existing records in PostgreSQL (idempotency) ──
  console.log('Step 2: Checking PostgreSQL for existing records...');

  const existingUsers = await pgDb.user.count();
  if (existingUsers > 0) {
    console.log(`WARNING: PostgreSQL already has ${existingUsers} users.`);
    console.log('This script will skip records that already exist (by ID).');
    console.log('To do a clean migration, clear the PostgreSQL database first.');
    console.log('');
  }

  // ── Step 3: Migrate records (FK order: Users → Posts → Comments → Likes → Bookmarks → Follows → Notifications) ──
  console.log('Step 3: Migrating records to PostgreSQL (in FK order)...');

  let inserted = { users: 0, posts: 0, comments: 0, likes: 0, bookmarks: 0, follows: 0, notifications: 0 };

  // 3a. Users (no FKs)
  for (const u of users) {
    try {
      await pgDb.user.create({ data: u });
      inserted.users++;
    } catch (e: unknown) {
      // Skip if already exists (P2002 = unique constraint violation)
      if ((e as { code?: string }).code === 'P2002') {
        console.log(`  User ${u.id}: already exists, skipping.`);
      } else {
        throw e;
      }
    }
  }
  console.log(`  Users: ${inserted.users} inserted`);

  // 3b. Posts (FK: authorId → User)
  for (const p of posts) {
    try {
      await pgDb.post.create({ data: p });
      inserted.posts++;
    } catch (e: unknown) {
      if ((e as { code?: string }).code === 'P2002') {
        console.log(`  Post ${p.id}: already exists, skipping.`);
      } else {
        throw e;
      }
    }
  }
  console.log(`  Posts: ${inserted.posts} inserted`);

  // 3c. Comments (FKs: postId → Post, userId → User)
  for (const c of comments) {
    try {
      await pgDb.comment.create({ data: c });
      inserted.comments++;
    } catch (e: unknown) {
      if ((e as { code?: string }).code === 'P2002') {
        console.log(`  Comment ${c.id}: already exists, skipping.`);
      } else {
        throw e;
      }
    }
  }
  console.log(`  Comments: ${inserted.comments} inserted`);

  // 3d. Likes (FKs: postId → Post, userId → User)
  for (const l of likes) {
    try {
      await pgDb.like.create({ data: l });
      inserted.likes++;
    } catch (e: unknown) {
      if ((e as { code?: string }).code === 'P2002') {
        console.log(`  Like ${l.id}: already exists, skipping.`);
      } else {
        throw e;
      }
    }
  }
  console.log(`  Likes: ${inserted.likes} inserted`);

  // 3e. Bookmarks (FKs: postId → Post, userId → User)
  for (const b of bookmarks) {
    try {
      await pgDb.bookmark.create({ data: b });
      inserted.bookmarks++;
    } catch (e: unknown) {
      if ((e as { code?: string }).code === 'P2002') {
        console.log(`  Bookmark ${b.id}: already exists, skipping.`);
      } else {
        throw e;
      }
    }
  }
  console.log(`  Bookmarks: ${inserted.bookmarks} inserted`);

  // 3f. Follows (FKs: followerId → User, followingId → User)
  for (const f of follows) {
    try {
      await pgDb.follow.create({ data: f });
      inserted.follows++;
    } catch (e: unknown) {
      if ((e as { code?: string }).code === 'P2002') {
        console.log(`  Follow ${f.id}: already exists, skipping.`);
      } else {
        throw e;
      }
    }
  }
  console.log(`  Follows: ${inserted.follows} inserted`);

  // 3g. Notifications (FK: userId → User)
  for (const n of notifications) {
    try {
      await pgDb.notification.create({ data: n });
      inserted.notifications++;
    } catch (e: unknown) {
      if ((e as { code?: string }).code === 'P2002') {
        console.log(`  Notification ${n.id}: already exists, skipping.`);
      } else {
        throw e;
      }
    }
  }
  console.log(`  Notifications: ${inserted.notifications} inserted`);

  console.log('');

  // ── Step 4: Verify record counts match ────────────────────────────
  console.log('Step 4: Verifying record counts in PostgreSQL...');

  const afterCounts = {
    users: await pgDb.user.count(),
    posts: await pgDb.post.count(),
    comments: await pgDb.comment.count(),
    likes: await pgDb.like.count(),
    bookmarks: await pgDb.bookmark.count(),
    follows: await pgDb.follow.count(),
    notifications: await pgDb.notification.count(),
  };

  console.log('PostgreSQL record counts:');
  console.log(JSON.stringify(afterCounts, null, 2));
  console.log('');

  // Compare
  let allMatch = true;
  for (const key of Object.keys(beforeCounts) as (keyof typeof beforeCounts)[]) {
    if (beforeCounts[key] !== afterCounts[key]) {
      console.error(`MISMATCH: ${key} — SQLite: ${beforeCounts[key]}, PostgreSQL: ${afterCounts[key]}`);
      allMatch = false;
    }
  }

  if (allMatch) {
    console.log('✅ All record counts match! Migration successful.');
  } else {
    console.error('❌ Some record counts do not match. Review the output above.');
  }

  await pgDb.$disconnect();
  console.log('');
  console.log('PostgreSQL connection closed.');
  console.log('SQLite database was NOT modified or deleted.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch((e) => {
  // Log error type and message without leaking credentials or connection strings
  const errorMsg = e instanceof Error ? e.message : String(e);
  const errorCode = (e as { code?: string }).code;
  console.error('');
  console.error('━━━ MIGRATION ERROR ━━━');
  console.error('Error code:', errorCode || 'N/A');
  console.error('Error message:', errorMsg.replace(/postgresql:\/\/[^\s]+/g, 'postgresql://***:***@***'));
  console.error('');
  console.error('The SQLite database was NOT modified.');
  console.error('Check your PostgreSQL connection and try again.');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(1);
});
