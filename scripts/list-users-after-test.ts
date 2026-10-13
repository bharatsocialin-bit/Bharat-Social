import { db } from '@/lib/db';

async function main() {
  const users = await db.user.findMany({ select: { id: true, username: true, email: true, role: true } });
  console.log(JSON.stringify(users, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
