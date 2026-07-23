import type { CalibratedConfig } from '../schema/calibrated-config.js';
import { PROVISION_BY_ID } from '../selection/catalog.js';
import type { FileMap } from './helpers.js';

/**
 * Build a failing test stub per selected invariant. They start as `.todo` so
 * the suite is green but the guarantees are enumerated and impossible to
 * forget — a project owner fills in the assertions.
 */
export function buildInvariantTests(config: CalibratedConfig): FileMap {
  const files: FileMap = {};
  for (const inv of config.invariants) {
    const desc = PROVISION_BY_ID.get(`invariant:${inv}`)?.description ?? 'Enforce this guarantee.';
    files[`tests/invariants/${inv}.test.ts`] =
      `import { describe, test } from 'vitest';\n\n` +
      `// Invariant: ${desc}\n` +
      `describe('${inv}', () => {\n` +
      `  test.todo('holds: ${desc.replace(/'/g, "\\'")}');\n` +
      `});\n`;
  }
  return files;
}
