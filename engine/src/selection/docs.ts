import { PROVISION_BY_ID } from './catalog.js';
import type { SelectionGraph } from './select.js';

const KIND_ORDER = ['plugin', 'blueprint', 'invariant', 'pattern'];
const shortName = (id: string): string => id.split(':')[1] ?? id;

/** Render the selection map as human- and LLM-friendly markdown. */
export function toMarkdown(graph: SelectionGraph): string {
  const provisionsByCondition = new Map<string, string[]>();
  for (const e of graph.edges) {
    const list = provisionsByCondition.get(e.condition) ?? [];
    list.push(e.provision);
    provisionsByCondition.set(e.condition, list);
  }

  let md = `# selection-map\n\n**Version:** ${graph.version}\n\n${graph.compositionSummary}\n\n`;

  md += '## How the kinds compose\n\n';
  for (const kind of KIND_ORDER) {
    md += `- **${kind}** — ${graph.kindRoles[kind as keyof typeof graph.kindRoles]}\n`;
  }
  md += '\n';

  md += '## Branches → options\n\n';
  for (const c of graph.conditions) {
    const provided = provisionsByCondition.get(c.id) ?? [];
    md += `### \`${c.id}\`\n\n${c.description}\n\n_${c.rationale}_\n\n`;
    for (const id of provided) {
      const p = PROVISION_BY_ID.get(id);
      const shared = (graph.sharing[id]?.length ?? 0) > 1 ? ` **(shared ×${graph.sharing[id]?.length})**` : '';
      md += `- \`${id}\` — ${p?.purpose ?? p?.description ?? ''}${shared}\n`;
    }
    md += '\n';
  }

  md += '## Provisions\n\n';
  for (const kind of KIND_ORDER) {
    const items = graph.provisions.filter((p) => p.kind === kind);
    if (!items.length) continue;
    md += `### ${kind}s\n\n`;
    for (const p of items) {
      const companions = p.worksWith.length ? ` _Works with: ${p.worksWith.map((w) => `\`${shortName(w)}\``).join(', ')}._` : '';
      md += `- \`${p.id}\` — ${p.purpose}${companions}\n`;
    }
    md += '\n';
  }

  const shared = Object.entries(graph.sharing).filter(([, conds]) => conds.length > 1);
  if (shared.length) {
    md += '## Shared across branches\n\n';
    md += '| Provision | Kind | Selected by |\n|---|---|---|\n';
    shared
      .sort((a, b) => KIND_ORDER.indexOf(PROVISION_BY_ID.get(a[0])?.kind ?? '') - KIND_ORDER.indexOf(PROVISION_BY_ID.get(b[0])?.kind ?? ''))
      .forEach(([id, conds]) => {
        md += `| \`${id}\` | ${PROVISION_BY_ID.get(id)?.kind ?? ''} | ${conds.map((c) => `\`${c}\``).join(', ')} |\n`;
      });
    md += '\n';
  }

  md += '> Generated from the Zod/TS source by `npm run selection:build`. Do not edit by hand.\n';
  return md;
}
