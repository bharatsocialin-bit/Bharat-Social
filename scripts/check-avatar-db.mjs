import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  select: {
    id: true,
    username: true,
    avatarUrl: true,
    supabaseUserId: true,
    onboardedAt: true,
    updatedAt: true,
  },
  orderBy: { updatedAt: 'desc' },
  take: 10,
});

console.log(JSON.stringify(users, null, 2));
await prisma.$disconnect();
