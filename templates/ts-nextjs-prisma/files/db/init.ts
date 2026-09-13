import 'dotenv/config';
import { createPrismaClient } from '../src/lib/prisma-client';
import { seedCategories } from './scenarios/workspace';

// db:init — reference data ONLY (categories, roles, lookup tables). This is
// initialization, not seeding: it runs in every environment, alongside
// migrations at deploy time. No fake data, ever.
const prisma = createPrismaClient();

seedCategories(prisma)
  .then((categories) => console.log(`db:init — ensured ${categories.size} reference categories.`))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
