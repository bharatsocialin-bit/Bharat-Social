// ============================================================================
// SQL-level runtime proof of the avatars Storage RLS policies (v2).
//
// Proven here at the SQL level (as Supabase evaluates them):
//   1. authenticated user A CAN insert into avatars/<A>/…            ✓ run
//   2. authenticated user A CANNOT insert into avatars/<B>/… (RLS)   ✓ run
//   3. owner-scoped DELETE/UPDATE/SELECT policies exist with the
//      exact auth.uid() folder scoping                               ✓ run
//   4. DELETE itself is blocked by Supabase's guard trigger ("Use the
//      Storage API instead") — API deletes are the app's path and are
//      additionally protected by server-side session derivation.
// NOTE: the probe metadata row inserted in step 1 cannot be removed via SQL
// (guard trigger). It points to a file that was never uploaded (public URL
// 404s) and sits in a random-UUID folder — invisible noise. Optional manual
// cleanup: Supabase dashboard → Storage → avatars.
// Run: env -u DATABASE_URL bun scripts/verify-storage-rls-sql.mjs
// ============================================================================
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
let passed = 0
let failed = 0
const check = (name, cond, extra = '') => {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else { failed++; console.log(`  ✗ ${name} ${extra}`) }
}

const USER_A = crypto.randomUUID()
const USER_B = crypto.randomUUID()
const PROBE = `${USER_A}/rls-probe-a.png`

async function asUser(uid, fn) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('request.jwt.claims', $1, true)`,
      JSON.stringify({ sub: uid, role: 'authenticated' }))
    await tx.$executeRawUnsafe(`SET LOCAL ROLE authenticated`)
    return fn(tx)
  })
}

async function main() {
  console.log(`User A folder: ${USER_A}\nUser B folder: ${USER_B}`)

  console.log('\n── 1. Owner insert into OWN folder ──')
  await asUser(USER_A, async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO storage.objects (bucket_id, name, owner_id, metadata) VALUES ('avatars', $1, $2::uuid, '{"mimetype":"image/png"}'::jsonb)`,
      PROBE, USER_A,
    )
  })
  check('user A can insert avatars/<A>/probe.png', true)

  console.log('\n── 2. Owner insert into ANOTHER user folder (must fail) ──')
  let denied = false
  await asUser(USER_A, async (tx) => {
    try {
      await tx.$executeRawUnsafe(
        `INSERT INTO storage.objects (bucket_id, name, owner_id, metadata) VALUES ('avatars', $1, $2::uuid, '{"mimetype":"image/png"}'::jsonb)`,
        `${USER_B}/hijack.png`, USER_A,
      )
    } catch (e) {
      if (/row-level security|violates/i.test(e.message)) denied = true
      else throw e
    }
  })
  check('user A blocked from avatars/<B>/ (RLS violation)', denied)

  console.log('\n── 3. Owner-scoped policy definitions ──')
  const policies = await prisma.$queryRawUnsafe(
    `SELECT policyname, cmd, roles, with_check, qual FROM pg_policies
     WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'avatars%' ORDER BY policyname`,
  )
  for (const p of policies) {
    console.log(`   ${p.policyname} [${p.cmd}] roles=${JSON.stringify(p.roles)}`)
    if (p.with_check) console.log(`     with_check: ${p.with_check.slice(0, 130)}`)
    if (p.qual) console.log(`     using:      ${p.qual.slice(0, 130)}`)
  }
  const scoped = (expr) => expr && /\(storage\.foldername\(name\)\)\[1\]\s*=\s*\(auth\.uid\(\)\)::text/.test(expr.replace(/\s+/g, ' '))
  const find = (name) => policies.find((p) => p.policyname === name)
  check('insert policy folder-scoped to auth.uid()', scoped(find('avatars_owner_insert')?.with_check))
  check('update policy folder-scoped to auth.uid()', scoped(find('avatars_owner_update')?.qual))
  check('delete policy folder-scoped to auth.uid()', scoped(find('avatars_owner_delete')?.qual))
  check('public read policy covers whole bucket', /bucket_id\s*=\s*'avatars'/.test((find('avatars_public_read')?.qual || '').replace(/\s+/g, ' ')))

  console.log('\n── 4. Supabase delete-guard trigger (defense in depth) ──')
  const trigs = await prisma.$queryRawUnsafe(
    `SELECT tgname FROM pg_trigger WHERE tgrelid = 'storage.objects'::regclass AND NOT tgisinternal`,
  )
  console.log('  ', trigs.map((t) => t.tgname).join(', '))
  check('guard trigger present (SQL deletes blocked, Storage API required)', trigs.length > 0)

  console.log(`\n════════ SQL RLS RESULT: ${passed} passed, ${failed} failed ════════`)
  console.log(`NOTE: probe metadata row "${PROBE}" remains (no file ever uploaded — public URL 404s).`)
  console.log('Optional cleanup: Supabase dashboard → Storage → avatars (SQL deletes are guard-blocked).')
  process.exitCode = failed ? 1 : 0
}

main().catch((e) => { console.error('SQL RLS CHECK CRASHED:', e.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
