// Prisma CLI configuration (migrate, generate, db seed). The runtime client
// gets its connection through the driver adapter in src/lib/prisma-client.ts.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // `prisma db seed` only. `migrate reset` does not run it — db:reset chains
    // db:seed explicitly, which is also what keeps the seed behind the stage guard.
    seed: 'tsx db/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
