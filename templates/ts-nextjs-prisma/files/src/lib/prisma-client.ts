import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * The one place a PrismaClient is constructed. Prisma talks to Postgres through
 * the pg driver adapter, so the connection URL is passed here rather than read
 * from the schema. Side-effect free: scripts and tests call it with their own
 * URL; the Next.js singleton in ./prisma.ts calls it with DATABASE_URL.
 */
export function createPrismaClient(connectionString: string | undefined = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) throw new Error('DATABASE_URL is not set (see .env.example)');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
