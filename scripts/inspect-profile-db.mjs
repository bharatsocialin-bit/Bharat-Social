// READ-ONLY inspection of the live Supabase DB for the profile feature.
// Checks: User table columns, storage buckets, avatars policies, user count.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'User'
    ORDER BY ordinal_position
  `)

  let buckets = null
  let bucketErr = null
  try {
    buckets = await prisma.$queryRawUnsafe(`
      SELECT id, public, file_size_limit, allowed_mime_types
      FROM storage.buckets
      ORDER BY id
    `)
  } catch (e) {
    bucketErr = String(e.message || e)
  }

  let policies = null
  let policyErr = null
  try {
    policies = await prisma.$queryRawUnsafe(`
      SELECT policyname, cmd, roles
      FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'avatars%'
      ORDER BY policyname
    `)
  } catch (e) {
    policyErr = String(e.message || e)
  }

  const userCount = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "User"`)
  const users = await prisma.$queryRawUnsafe(`
    SELECT username, email, role, "onboardedAt" IS NOT NULL AS onboarded, "avatarUrl" IS NOT NULL AS has_avatar
    FROM "User" ORDER BY "createdAt" LIMIT 10
  `)

  console.log('=== USER COLUMNS ===')
  for (const c of cols) console.log(` ${c.column_name} | ${c.data_type} | nullable=${c.is_nullable} | default=${c.column_default}`)
  console.log('=== STORAGE BUCKETS ===', bucketErr ? `ERROR: ${bucketErr}` : '')
  if (buckets) for (const b of buckets) console.log(` ${b.id} | public=${b.public} | size_limit=${b.file_size_limit} | mimes=${JSON.stringify(b.allowed_mime_types)}`)
  console.log('=== AVATARS POLICIES ===', policyErr ? `ERROR: ${policyErr}` : '')
  if (policies) for (const p of policies) console.log(` ${p.policyname} | cmd=${p.cmd}`)
  console.log('=== USERS ===')
  console.log(` total: ${userCount[0].n}`)
  for (const u of users) console.log(` ${u.username} | ${u.email} | role=${u.role} | onboarded=${u.onboarded} | avatar=${u.has_avatar}`)
}

main().catch((e) => { console.error('INSPECT FAILED:', e); process.exit(1) }).finally(() => prisma.$disconnect())
