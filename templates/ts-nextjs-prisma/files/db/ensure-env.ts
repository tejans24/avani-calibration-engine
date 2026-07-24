import { copyFileSync, existsSync } from 'node:fs';

// Clone -> install -> `npm run dev` must work: bootstrap .env from the example
// on first run so prisma and the seed scripts have a DATABASE_URL.
if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
  console.log('Created .env from .env.example');
}
