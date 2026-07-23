import { PROVISION_BY_ID } from './catalog.js';
import type { SelectionGraph } from './select.js';

const KIND_ORDER = ['plugin', 'blueprint', 'invariant', 'pattern'];

/** Render the selection map as human- and LLM-friendly markdown. */
export function toMarkdown(graph: SelectionGraph): string {
  const provisionsByCondition = new Map<string, string[]>();
  for (const e of graph.edges) {
    const list = provisionsByCondition.get(e.condition) ?? [];
    list.push(e.provision);
    provisionsByCondition.set(e.condition, list);
  }

  let md = `# selection-map\n\n**Version:** ${graph.version}\n\n`;
  md += 'The rules that turn calibration dials + signals into selected plugins, blueprints, invariants, and patterns. A provision under more than one branch is *shared* across branches.\n\n';

  md += '## Branches → options\n\n';
  for (const c of graph.conditions) {
    const provided = provisionsByCondition.get(c.id) ?? [];
    md += `### \`${c.id}\`\n\n${c.description}\n\n`;
    for (const id of provided) {
      const p = PROVISION_BY_ID.get(id);
      const shared = (graph.sharing[id]?.length ?? 0) > 1 ? ` _(shared ×${graph.sharing[id]?.length})_` : '';
      md += `- \`${id}\` — ${p?.description ?? ''}${shared}\n`;
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
