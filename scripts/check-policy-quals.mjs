import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const rows = await prisma.$queryRawUnsafe(
  "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects' ORDER BY policyname"
);
for (const r of rows) {
  console.log(`--- ${r.policyname} [${r.cmd}]`);
  console.log(`USING: ${r.qual}`);
  console.log(`WITH CHECK: ${r.with_check}`);
}
await prisma.$disconnect();
