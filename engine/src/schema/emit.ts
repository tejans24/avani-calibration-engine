import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toMarkdown } from './docs.js';
import { toJsonSchema } from './json-schema.js';
import { SCHEMAS } from './registry.js';

/**
 * Emit every canonical schema to `outDir` as both a JSON Schema (`.schema.json`)
 * and generated docs (`.md`). Returns the paths written.
 */
export function emitAll(outDir: string): string[] {
  const written: string[] = [];
  for (const { name, schema } of SCHEMAS) {
    const json = toJsonSchema(name, schema);
    const jsonPath = join(outDir, `${name}.schema.json`);
    writeFileSync(jsonPath, `${JSON.stringify(json, null, 2)}\n`);
    written.push(jsonPath);

    const mdPath = join(outDir, `${name}.md`);
    writeFileSync(mdPath, toMarkdown(name, json));
    written.push(mdPath);
  }
  return written;
}
