import type { z } from 'zod';
import { CalibratedConfigSchema } from './calibrated-config.js';
import { IntakeProfileSchema } from './intake-profile.js';

/** Every canonical schema the engine emits and validates against. */
export const SCHEMAS: ReadonlyArray<{ name: string; schema: z.ZodType }> = [
  { name: 'intake-profile', schema: IntakeProfileSchema },
  { name: 'calibrated-config', schema: CalibratedConfigSchema },
];
