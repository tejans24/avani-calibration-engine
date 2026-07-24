import { PrismaClient } from '@prisma/client';

// Next.js dev-mode hot reload creates fresh module instances; keep one client.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
