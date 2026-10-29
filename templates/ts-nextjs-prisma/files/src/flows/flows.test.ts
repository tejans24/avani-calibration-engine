import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, test } from 'vitest';
import { FLOWS, visitedPaths } from './flows';

const APP = join(process.cwd(), 'src', 'app');

/** Route patterns from src/app/**\/page.tsx: route groups dropped, [param] segments kept. */
function pageRoutes(dir = APP): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pageRoutes(path);
    if (entry.name !== 'page.tsx') return [];
    const segments = relative(APP, dir)
      .split(sep)
      .filter((s) => s && !(s.startsWith('(') && s.endsWith(')')));
    return [`/${segments.join('/')}`];
  });
}

/** `/notes/[id]` matches `/notes/abc`. */
function matches(route: string, path: string): boolean {
  const pattern = route.replace(/\[\.\.\.[^\]]+\]/g, '.+').replace(/\[[^\]]+\]/g, '[^/]+');
  return new RegExp(`^${pattern}$`).test(path.split('?')[0] ?? path);
}

describe('flows', () => {
  test('every page is visited by at least one flow', () => {
    const visited = [...visitedPaths()];
    const unvisited = pageRoutes().filter((route) => !visited.some((path) => matches(route, path)));
    expect(unvisited, 'add a flow to src/flows/flows.ts that opens each of these pages').toEqual([]);
  });

  test('flow ids are unique and every flow starts by opening a page', () => {
    expect(new Set(FLOWS.map((f) => f.id)).size).toBe(FLOWS.length);
    for (const flow of FLOWS) expect(flow.steps[0]?.action, flow.id).toHaveProperty('goto');
  });

  test('every step tells the reviewer what to do and what to expect', () => {
    for (const flow of FLOWS) {
      for (const step of flow.steps) {
        expect(step.tell.trim(), flow.id).not.toBe('');
        expect(step.see.trim(), flow.id).not.toBe('');
      }
    }
  });
});
