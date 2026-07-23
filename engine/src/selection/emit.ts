import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toMarkdown } from './docs.js';
import { renderGraphHtml } from './graph-html.js';
import { buildGraph, validateGraph } from './select.js';

/**
 * Emit the selection map as: the serialized graph (selection-map.json), docs
 * (selection-map.md), and the interactive explorer (graph.html) — all from the
 * same source, so the picture never drifts from the rules the engine runs.
 */
export function emitAll(outDir: string): string[] {
  const problems = validateGraph();
  if (problems.length) throw new Error(`selection map integrity errors:\n  ${problems.join('\n  ')}`);

  const graph = buildGraph();
  mkdirSync(outDir, { recursive: true });
  const written: string[] = [];

  const jsonPath = join(outDir, 'selection-map.json');
  writeFileSync(jsonPath, `${JSON.stringify(graph, null, 2)}\n`);
  written.push(jsonPath);

  const mdPath = join(outDir, 'selection-map.md');
  writeFileSync(mdPath, toMarkdown(graph));
  written.push(mdPath);

  const htmlPath = join(outDir, 'graph.html');
  writeFileSync(htmlPath, renderGraphHtml(graph));
  written.push(htmlPath);

  return written;
}
