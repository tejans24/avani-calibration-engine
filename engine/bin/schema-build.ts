#!/usr/bin/env tsx
import { join } from 'node:path';
import { emitAll } from '../src/schema/emit.js';

const outDir = join(import.meta.dirname, '..', '..', 'schemas');
const written = emitAll(outDir);
console.log(`Wrote ${written.length} files:`);
for (const path of written) console.log(`  ${path}`);
