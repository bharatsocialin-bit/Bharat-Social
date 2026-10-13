import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure Prisma logging:
//   - Always log errors and warnings (production-safe).
//   - Only log individual queries if DEBUG_PRISMA=1 is explicitly set.
//   - Default: no query logging (avoids leaking user data via console + dev.log).
//
// Previously this was `log: ['query']` which logged EVERY SQL statement to the
// console, including SELECTs against the User table during auth (which carry
// email values and password hashes during the bcrypt lookup). That's a
// sensitive-data leak if dev.log is ever shared as a debug artifact.
const logConfig = process.env.DEBUG_PRISMA === '1'
  ? ['query', 'error', 'warn']
  : ['error', 'warn'];

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logConfig as Array<'query' | 'error' | 'warn' | 'info'>,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db