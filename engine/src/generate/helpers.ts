import type { Selection } from '../selection/select.js';

export const ENGINE_VERSION = '0.5.0';

export const shortName = (id: string): string => id.split(':')[1] ?? id;

/** Selected provision short-names by kind, in selection order. */
export function byKind(selection: Selection, kind: string): string[] {
  return selection.provisions.filter((p) => p.kind === kind).map((p) => shortName(p.id));
}

/** A generated project is an in-memory map of repo-relative path -> file content. */
export type FileMap = Record<string, string>;
