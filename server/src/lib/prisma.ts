import { PrismaClient } from '@prisma/client';

// A single shared client keeps the SQLite connection pool small and avoids
// exhausting file handles when the dev server hot-reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
