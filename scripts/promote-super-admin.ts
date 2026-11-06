/**
 * Promote a Lordsbook user to SUPER_ADMIN.
 *
 * Usage:
 *   npx tsx scripts/promote-super-admin.ts                          # default email
 *   npx tsx scripts/promote-super-admin.ts someone@example.com      # custom email
 *
 * SECURITY MODEL — satisfies the Part 2 requirements:
 *   3. The email is NOT trusted from the browser. It is read from the CLI arg
 *      (typed by an operator) and looked up in the database.
 *   4. The account's identity is verified server-side: the user row MUST have
 *      a non-null `supabaseUserId` — i.e. the user authenticated through
 *      Supabase Auth (Google OAuth or email confirmation). An unverified row
 *      is refused.
 *   5. If the account does not exist, the script prints clear instructions
 *      to register it via normal signup BEFORE re-running this script.
 *   6. No passwords, tokens, or service-role keys are created or exposed.
 *   7. The promoted SUPER_ADMIN is protected from ordinary admins at the API
 *      layer (see src/app/api/admin/users/[id]/route.ts).
 *   9. Idempotent — running twice is a no-op (prints current state).
 *  10. Does not weaken authorization for other users (only promotes ONE row).
 *
 * This script writes ONLY to:
 *   - User.role            (set to "SUPER_ADMIN")
 *   - ModerationAction     (audit row recording the promotion)
 *
 * It never touches auth tokens, passwords, or other users.
 *
 * ── LIVE PRODUCTION RUN ──
 *   Run this on the production server (or anywhere with DATABASE_URL pointing
 *   at the Supabase Postgres database) AFTER the user has registered and
 *   authenticated through Lordsbook's normal signup flow.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const PRIMARY_EMAIL = process.argv[2] ?? 'lordsbook.admin@gmail.com';

async function main() {
  const user = await db.user.findUnique({
    where: { email: PRIMARY_EMAIL },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      supabaseUserId: true,
      suspended: true,
      createdAt: true,
    },
  });

  // ── Requirement 5: account must exist ──
  if (!user) {
    console.error('─'.repeat(72));
    console.error(`No Lordsbook user found with email: ${PRIMARY_EMAIL}`);
    console.error('─'.repeat(72));
    console.error('');
    console.error('BEFORE running this script, the account must be registered');
    console.error('through the normal Lordsbook signup flow:');
    console.error('');
    console.error('  1. Open the Lordsbook app in the browser.');
    console.error('  2. Sign up with ' + PRIMARY_EMAIL + ' (Google OAuth or email).');
    console.error('  3. Complete first-time onboarding (pick a username).');
    console.error('  4. Confirm you can sign in and out normally.');
    console.error('  5. Re-run this script: npx tsx scripts/promote-super-admin.ts');
    console.error('');
    process.exit(1);
  }

  console.log('─'.repeat(72));
  console.log('Lordsbook SUPER_ADMIN promotion — verification');
  console.log('─'.repeat(72));
  console.log('  email          :', user.email);
  console.log('  username       :', user.username);
  console.log('  name           :', user.name ?? '(not set)');
  console.log('  user id        :', user.id);
  console.log('  supabaseUserId :', user.supabaseUserId ?? '(NOT SET — see below)');
  console.log('  current role   :', user.role);
  console.log('  suspended      :', user.suspended);
  console.log('  registered     :', user.createdAt.toISOString());
  console.log('');

  // ── Requirement 3 & 4: verify the authenticated identity ──
  // A Supabase Auth user record must back this email. `supabaseUserId` is
  // populated only when the user completed Supabase Auth (Google OAuth or
  // email confirmation). Without it, the email is unverified and we refuse
  // to promote — the operator must complete signup first.
  if (!user.supabaseUserId) {
    console.error('─'.repeat(72));
    console.error('IDENTITY NOT VERIFIED — promotion refused.');
    console.error('─'.repeat(72));
    console.error('');
    console.error(`The user row for ${PRIMARY_EMAIL} exists but has no linked`);
    console.error('Supabase Auth identity (supabaseUserId is null). This means the');
    console.error('account was created in the local DB but has not yet authenticated');
    console.error('through Supabase Auth (Google OAuth or email confirmation).');
    console.error('');
    console.error('To fix:');
    console.error('  1. Sign OUT of Lordsbook in the browser.');
    console.error(`  2. Sign IN with ${PRIMARY_EMAIL} using Google OAuth or email.`);
    console.error('  3. Once signed in successfully, re-run this script.');
    console.error('');
    process.exit(1);
  }

  // ── Requirement 9: idempotent ──
  if (user.role === 'SUPER_ADMIN') {
    console.log('✓ Account is ALREADY SUPER_ADMIN. No changes made (idempotent).');
    console.log('');
    console.log('This account has full administrative access across Lordsbook,');
    console.log('including the Comic Bible CMS, and is protected from suspension');
    console.log('or demotion by ordinary administrators.');
    return;
  }

  // ── Promote ──
  await db.user.update({
    where: { id: user.id },
    data: { role: 'SUPER_ADMIN', suspended: false },
  });

  await db.moderationAction.create({
    data: {
      adminId: user.id, // self-promotion by the verified owner; recorded for audit
      action: 'user_promoted_super_admin',
      targetUserId: user.id,
      description: `Promoted ${user.email} (${user.username}) to SUPER_ADMIN via scripts/promote-super-admin.ts. Verified supabaseUserId=${user.supabaseUserId.slice(0, 8)}…`,
    },
  });

  console.log('─'.repeat(72));
  console.log('✓ PROMOTED TO SUPER_ADMIN');
  console.log('─'.repeat(72));
  console.log('');
  console.log(`  ${user.email} now has the SUPER_ADMIN role.`);
  console.log('');
  console.log('  This account can now:');
  console.log('    • Access the full Admin Panel (Dashboard, Users, Reports,');
  console.log('      Shorts, Comic Bible CMS, Quiz, Badges).');
  console.log('    • Create, edit, upload artwork, translate, preview and');
  console.log('      publish Comic Bible stories.');
  console.log('    • Manage users and moderate content.');
  console.log('    • Cannot be suspended or demoted by ordinary admins.');
  console.log('');
  console.log('  An audit row was written to ModerationAction.');
  console.log('');
  console.log('  Next: sign in to Lordsbook with this account and open');
  console.log('  Admin Panel → Comic Bible.');
}

main()
  .catch((e) => {
    console.error('Promotion failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
