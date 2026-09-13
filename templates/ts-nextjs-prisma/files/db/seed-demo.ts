import 'dotenv/config';
import { createPrismaClient } from '../src/lib/prisma-client';
import { demoWorkspace } from './scenarios/workspace';
import { assertNotProduction } from './stage';

// Demo seed: curated, presentable. For staging/demo environments — never prod.
assertNotProduction('db:seed:demo');

const prisma = createPrismaClient();

async function main(): Promise<void> {
  await demoWorkspace(prisma);
  console.log('db:seed:demo — seeded the curated demo workspace.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
