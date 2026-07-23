import { z } from 'zod';
import { SCHEMA_VERSION } from './version.js';

/**
 * Convert a Zod schema to a portable, vendor-neutral JSON Schema document.
 *
 * JSON Schema is the interoperable artifact: consumable by any tool or model,
 * and the basis for generated docs. Field `.describe()` text flows through
 * automatically as JSON Schema `description`.
 */
export function toJsonSchema(name: string, schema: z.ZodType): Record<string, unknown> {
  const body = z.toJSONSchema(schema) as Record<string, unknown>;
  // Strip any $schema the converter emitted; we set our own header fields first.
  delete body['$schema'];
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `https://avani.dev/schemas/${name}/v${SCHEMA_VERSION}`,
    title: name,
    'x-schemaVersion': SCHEMA_VERSION,
    ...body,
  };
}
