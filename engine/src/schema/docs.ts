/**
 * Render a JSON Schema document to human- and LLM-friendly markdown.
 *
 * Nested object properties are emitted as their own sub-tables so the whole
 * contract is readable at a glance and searchable/editable in review.
 */

interface JsonSchemaNode {
  type?: string;
  description?: string;
  enum?: string[];
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  items?: JsonSchemaNode;
}

function typeLabel(node: JsonSchemaNode): string {
  if (node.enum) return 'enum';
  if (node.type === 'array') {
    const inner = node.items?.enum ? 'enum' : (node.items?.type ?? 'any');
    return `${inner}[]`;
  }
  return node.type ?? 'object';
}

function values(node: JsonSchemaNode): string {
  const e = node.enum ?? node.items?.enum;
  return e ? e.map((v) => `\`${v}\``).join(' · ') : '';
}

function cell(text: string): string {
  return (text ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function table(node: JsonSchemaNode): string {
  const props = node.properties ?? {};
  const required = new Set(node.required ?? []);
  let out = '| Field | Type | Required | Values | Description |\n|---|---|---|---|---|\n';
  for (const [key, val] of Object.entries(props)) {
    out += `| \`${key}\` | ${typeLabel(val)} | ${required.has(key) ? 'yes' : 'no'} | ${cell(values(val))} | ${cell(val.description ?? '')} |\n`;
  }
  return out;
}

function nestedObjects(node: JsonSchemaNode): Array<[string, JsonSchemaNode]> {
  const out: Array<[string, JsonSchemaNode]> = [];
  for (const [key, val] of Object.entries(node.properties ?? {})) {
    if (val.properties) out.push([key, val]);
    if (val.type === 'array' && val.items?.properties) out.push([key, val.items]);
  }
  return out;
}

export function toMarkdown(name: string, json: Record<string, unknown>): string {
  const node = json as JsonSchemaNode & { 'x-schemaVersion'?: string; description?: string };
  let md = `# ${name}\n\n`;
  md += `**Schema version:** ${(json as Record<string, unknown>)['x-schemaVersion']}\n\n`;
  if (node.description) md += `${node.description}\n\n`;
  md += table(node);
  for (const [key, sub] of nestedObjects(node)) {
    md += `\n### ${key}\n\n`;
    if (sub.description) md += `${sub.description}\n\n`;
    md += table(sub);
  }
  md += '\n> Generated from the Zod source by `npm run schema:build`. Do not edit by hand.\n';
  return md;
}
