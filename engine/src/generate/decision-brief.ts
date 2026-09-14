import type { CalibratedConfig, InfraOptionRecord } from '../schema/calibrated-config.js';

/**
 * `.avani/decisions/infra.md` — the decision brief the owner reads before
 * deciding the deploy target (SPEC §4.1): the engine's proposal and why, every
 * option explained for this project, what the engine could not consider, and
 * how to record the decision. Regenerated from the config; the decision log
 * in ROADMAP.md is where the owner's reasoning accumulates over time.
 */

const FIT_LABEL: Record<InfraOptionRecord['fit'], string> = {
  recommended: 'RECOMMENDED',
  viable: 'viable',
  'not-recommended': 'not recommended',
};

function renderOption(o: InfraOptionRecord): string[] {
  const lines = [`### \`${o.target}\` — ${FIT_LABEL[o.fit]}${o.evidence === 'shipped' ? ' · backed by a shipped project' : ''}`, ''];
  lines.push(`- **What it is:** ${o.what}`);
  lines.push(`- **For this project:** ${o.why}`);
  lines.push(`- **Trade-offs:** ${o.tradeoffs}`);
  lines.push(`- **Cost shape:** ${o.cost_shape}`);
  lines.push(`- **Ops burden:** ${o.ops_burden}`);
  if (o.becomes_the_answer_if) lines.push(`- **Becomes the answer if:** ${o.becomes_the_answer_if}`);
  lines.push('');
  return lines;
}

export function buildInfraDecisionBrief(config: CalibratedConfig): string | null {
  const d = config.decisions?.infra;
  if (!d) return null;

  const lines: string[] = [];
  lines.push('# Deploy target — decision brief', '');
  lines.push('> The engine proposes; the owner decides. This brief lists every option and what it would cost you, so the decision is made with the menu in view, not just the pick. Rules: SPEC §4.1; profiles: SPEC §4.2.', '');

  lines.push('## Status', '');
  if (d.status === 'decided') {
    const overrode = d.decided !== d.proposed ? ` — **overrides** the engine's \`${d.proposed}\`` : ' — accepts the engine proposal';
    lines.push(`**Decided: \`${d.decided}\`** by ${d.decided_by}${overrode}.${d.note ? ` Reason: ${d.note}.` : ''}`, '');
    lines.push('Re-deciding is an owner action recorded in `ROADMAP.md` → Decisions, never a per-session choice. Re-open it if any input under "Not yet considered" starts to apply.', '');
  } else {
    lines.push(`**Proposed: \`${d.proposed}\` — not yet decided.** Nothing deploys on a proposal.`, '');
    lines.push('To decide, re-run calibration with the owner\'s choice and reason:', '');
    lines.push('```bash');
    lines.push(`calibrate generate <intake.json> --infra ${d.proposed} --why "<reason>"   # accept`);
    lines.push('calibrate generate <intake.json> --infra <other>  --why "<reason>"   # override');
    lines.push('```', '');
  }

  lines.push('## The engine\'s proposal', '');
  lines.push(`\`${d.proposed}\` — rule ${d.rule}: ${d.rationale}`, '');
  lines.push(`Runner-up: \`${d.runner_up ?? 'none'}\`.`, '');

  lines.push('## Options', '');
  for (const o of d.options) lines.push(...renderOption(o));

  lines.push('## Not yet considered', '');
  lines.push('The intake profile does not carry these inputs yet, so the rules that need them could not fire. If any applies to this project, it changes the answer — weigh them before accepting.', '');
  for (const u of d.unanswered) lines.push(`- ${u}`);
  lines.push('');

  return lines.join('\n');
}
