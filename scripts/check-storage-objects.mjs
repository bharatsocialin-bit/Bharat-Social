import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const J = (v) => JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? Number(x) : x), 2);

const buckets = await prisma.$queryRawUnsafe(
  "SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets"
);
console.log("=== buckets ===");
console.log(J(buckets));

const objects = await prisma.$queryRawUnsafe(
  "SELECT bucket_id, name, created_at, metadata->>'size' as size, metadata->>'mimetype' as mimetype FROM storage.objects ORDER BY created_at DESC LIMIT 10"
);
console.log("=== recent objects (all buckets) ===");
console.log(J(objects));

const policies = await prisma.$queryRawUnsafe(
  "SELECT policyname, cmd, qual FROM pg_policies WHERE schemaname='storage' AND tablename='objects' ORDER BY policyname"
);
console.log("=== storage.objects policies ===");
for (const p of policies) console.log(`- ${p.policyname} [${p.cmd}]`);

await prisma.$disconnect();
