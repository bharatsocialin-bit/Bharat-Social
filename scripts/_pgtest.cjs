const { PrismaClient } = require('@prisma/client');
// sqlite client to compare counts
const url = process.argv[2];
const pg = new PrismaClient({ datasources: { db: { url } } });
(async () => {
  const r = await pg.$queryRaw`SELECT version() as v, current_database() as d`;
  console.log('CONNECTED ✓', JSON.stringify(r[0]).slice(0, 120));
  await pg.$disconnect();
})().catch(e => { console.error('FAIL:', e.message.slice(0, 200)); process.exit(1); });
