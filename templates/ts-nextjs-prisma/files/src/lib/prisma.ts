import type { PrismaClient } from '@prisma/client';
import { createPrismaClient } from './prisma-client';

// Next.js dev-mode hot reload creates fresh module instances; keep one client.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
