import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { busyWorkspace } from './scenarios/workspace';
import { assertDevStage } from './stage';

// Dev seed: rich, messy, edge-case-heavy. HARD-GATED to dev — faker-in-prod is
// a career-limiting incident. Idempotent: skips when data already exists.
assertDevStage('db:seed');

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const existing = await prisma.note.count();
  if (existing > 0) {
    console.log(`db:seed — ${existing} notes already present, skipping (db:reset for a fresh seed).`);
    return;
  }
  await busyWorkspace(prisma, { seed: 1, noteCount: 24 });
  console.log('db:seed — seeded the busy-workspace scenario (deterministic, seed=1).');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
