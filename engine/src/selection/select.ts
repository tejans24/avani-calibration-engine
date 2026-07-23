import type { SelectionContext } from './context.js';
import {
  CONDITION_BY_ID,
  CONDITIONS,
  PROVISION_BY_ID,
  PROVISIONS,
  Provision,
  RULES,
  SELECTION_VERSION,
} from './catalog.js';

export interface Selection {
  /** Provisions selected for this context, deduped, in catalog order. */
  provisions: Provision[];
  /** provisionId -> the condition ids that selected it (fan-in / sharing). */
  byProvision: Record<string, string[]>;
  /** Condition ids whose predicate was true for this context. */
  firedConditions: string[];
}

/** Run the selection map against a calibration context. */
export function select(ctx: SelectionContext): Selection {
  const fired = new Set(CONDITIONS.filter((c) => c.test(ctx)).map((c) => c.id));
  const byProvision: Record<string, string[]> = {};

  for (const rule of RULES) {
    if (!fired.has(rule.condition)) continue;
    for (const id of rule.provides) {
      (byProvision[id] ??= []).push(rule.condition);
    }
  }

  const provisions = PROVISIONS.filter((p) => byProvision[p.id]);
  return { provisions, byProvision, firedConditions: [...fired] };
}

/** A serializable, view-agnostic representation of the whole selection map. */
export interface SelectionGraph {
  version: string;
  conditions: Array<{ id: string; label: string; description: string }>;
  provisions: Array<{ id: string; kind: string; description: string; tier?: 1 | 2 }>;
  edges: Array<{ condition: string; provision: string }>;
  /** provisionId -> condition ids that provide it (precomputed for the "shared" view). */
  sharing: Record<string, string[]>;
}

/** Build the static graph of the entire selection map (independent of any context). */
export function buildGraph(): SelectionGraph {
  const conditions = CONDITIONS.map(({ id, label, description }) => ({ id, label, description }));
  const provisions = PROVISIONS.map((p) => (p.tier ? { ...p } : { id: p.id, kind: p.kind, description: p.description }));
  const edges: SelectionGraph['edges'] = [];
  const sharing: Record<string, string[]> = {};

  for (const rule of RULES) {
    for (const provision of rule.provides) {
      edges.push({ condition: rule.condition, provision });
      (sharing[provision] ??= []).push(rule.condition);
    }
  }

  return { version: SELECTION_VERSION, conditions, provisions, edges, sharing };
}

/** Integrity check: every rule references a real condition and real provisions. */
export function validateGraph(): string[] {
  const problems: string[] = [];
  for (const rule of RULES) {
    if (!CONDITION_BY_ID.has(rule.condition)) problems.push(`rule references unknown condition: ${rule.condition}`);
    for (const id of rule.provides) {
      if (!PROVISION_BY_ID.has(id)) problems.push(`rule ${rule.condition} references unknown provision: ${id}`);
    }
  }
  return problems;
}
