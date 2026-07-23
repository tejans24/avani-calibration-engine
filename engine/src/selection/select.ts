import type { SelectionContext } from './context.js';
import {
  COMPOSITION_SUMMARY,
  CONDITION_BY_ID,
  CONDITIONS,
  KIND_ROLES,
  PROVISION_BY_ID,
  PROVISIONS,
  Provision,
  ProvisionKind,
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
  /** How the four kinds compose in tandem. */
  compositionSummary: string;
  kindRoles: Record<ProvisionKind, string>;
  conditions: Array<{ id: string; label: string; description: string; rationale: string }>;
  provisions: Array<{
    id: string;
    kind: string;
    description: string;
    purpose: string;
    /** Companion provisions (symmetrized: own worksWith + anyone who lists this one). */
    worksWith: string[];
    tier?: 1 | 2;
  }>;
  edges: Array<{ condition: string; provision: string }>;
  /** provisionId -> condition ids that provide it (precomputed for the "shared" view). */
  sharing: Record<string, string[]>;
}

/** Build the static graph of the entire selection map (independent of any context). */
export function buildGraph(): SelectionGraph {
  const conditions = CONDITIONS.map(({ id, label, description, rationale }) => ({ id, label, description, rationale }));

  // Symmetrize worksWith: a companion link holds in both directions.
  const companions = new Map<string, Set<string>>(PROVISIONS.map((p) => [p.id, new Set(p.worksWith ?? [])]));
  for (const p of PROVISIONS) {
    for (const other of p.worksWith ?? []) companions.get(other)?.add(p.id);
  }

  const provisions = PROVISIONS.map((p) => ({
    id: p.id,
    kind: p.kind,
    description: p.description,
    purpose: p.purpose,
    worksWith: [...(companions.get(p.id) ?? [])].sort(),
    ...(p.tier ? { tier: p.tier } : {}),
  }));

  const edges: SelectionGraph['edges'] = [];
  const sharing: Record<string, string[]> = {};
  for (const rule of RULES) {
    for (const provision of rule.provides) {
      edges.push({ condition: rule.condition, provision });
      (sharing[provision] ??= []).push(rule.condition);
    }
  }

  return { version: SELECTION_VERSION, compositionSummary: COMPOSITION_SUMMARY, kindRoles: KIND_ROLES, conditions, provisions, edges, sharing };
}

/** Integrity check: every rule and every worksWith link references real nodes. */
export function validateGraph(): string[] {
  const problems: string[] = [];
  for (const rule of RULES) {
    if (!CONDITION_BY_ID.has(rule.condition)) problems.push(`rule references unknown condition: ${rule.condition}`);
    for (const id of rule.provides) {
      if (!PROVISION_BY_ID.has(id)) problems.push(`rule ${rule.condition} references unknown provision: ${id}`);
    }
  }
  for (const p of PROVISIONS) {
    for (const id of p.worksWith ?? []) {
      if (!PROVISION_BY_ID.has(id)) problems.push(`${p.id} worksWith unknown provision: ${id}`);
    }
  }
  return problems;
}
