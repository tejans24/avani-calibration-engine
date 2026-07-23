#!/usr/bin/env tsx
import { join } from 'node:path';
import { emitAll } from '../src/selection/emit.js';

const outDir = join(import.meta.dirname, '..', '..', 'selection');
const written = emitAll(outDir);
console.log(`Wrote ${written.length} files:`);
for (const path of written) console.log(`  ${path}`);
