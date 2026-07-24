import { assertDevStage } from './stage';

// Pre-step of `npm run db:reset` — dropping the database is dev-only, always.
assertDevStage('db:reset');
