/**
 * Builds walkthrough/index.html from the screenshots tests/e2e/walkthrough.spec.ts
 * took: one page, every flow, every step with its picture, what to do and what
 * should happen. The reviewer marks each step "Works" or "Something's off"
 * with a note, then presses "Copy my review" and pastes the result back to
 * whoever is building (or into ROADMAP.md). Pictures are embedded, so the one
 * file can be sent to anyone.
 *
 * Exits 1 if any flow failed to run, after writing the page — a failed flow
 * shows where it broke.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FLOWS, TOUR, tourSequence, type Flow } from '../src/flows/flows';

const OUT = 'walkthrough';
const APP_NAME = (JSON.parse(readFileSync('package.json', 'utf8')) as { name: string }).name;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function resultOf(flow: Flow): { failedAt: number | null; error: string | null } | null {
  const path = join(OUT, `${flow.id}.result.json`);
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as { failedAt: number | null; error: string | null }) : null;
}

function shot(flow: Flow, i: number): string {
  const path = join(OUT, 'shots', `${flow.id}-${i + 1}.png`);
  return existsSync(path)
    ? `<img src="data:image/png;base64,${readFileSync(path).toString('base64')}" alt="Screen after step ${i + 1} of ${esc(flow.title)}">`
    : '<p class="missing">No picture — the walkthrough did not reach this step.</p>';
}

let failed = 0;
const sections = tourSequence().map(({ chapter, flow }, i, all) => {
  const result = resultOf(flow);
  if (!result || result.failedAt !== null) failed += 1;
  const status = !result
    ? '<p class="status bad">Not run.</p>'
    : result.failedAt !== null
      ? `<p class="status bad">Broke at step ${result.failedAt + 1}: ${esc(result.error ?? 'failed')}</p>`
      : '<p class="status good">Ran end to end.</p>';
  const steps = flow.steps
    .map((step, i) => {
      const key = `${flow.id}:${i + 1}`;
      return `<li class="step">
  <p class="do"><strong>Step ${i + 1}.</strong> ${esc(step.tell)}</p>
  ${shot(flow, i)}
  <p class="see"><strong>You should see:</strong> ${esc(step.see)}</p>
  <fieldset data-key="${esc(key)}">
    <legend>Does this step work?</legend>
    <label><input type="radio" name="${esc(key)}" value="works"> Works</label>
    <label><input type="radio" name="${esc(key)}" value="off"> Something's off</label>
    <label class="note">What's off? <textarea rows="2"></textarea></label>
  </fieldset>
</li>`;
    })
    .join('\n');
  const opensChapter = i === 0 || all[i - 1]?.chapter !== chapter;
  const ch = TOUR.chapters[chapter];
  const heading =
    opensChapter && ch
      ? `<header class="chapter"><p class="meta">Chapter ${chapter + 1} of ${TOUR.chapters.length}</p><h2>${esc(ch.title)}</h2><p><strong>You are:</strong> ${esc(ch.as)}</p><p>${esc(ch.story)}</p></header>\n`
      : '';
  return `${heading}<section aria-labelledby="${esc(flow.id)}">
  <h3 id="${esc(flow.id)}">${esc(flow.title)}</h3>
  <p class="meta">${esc(flow.who)} · ${esc(flow.why)}</p>
  ${status}
  <ol>${steps}</ol>
</section>`;
});

const flowIndex = JSON.stringify(
  Object.fromEntries(FLOWS.flatMap((f) => f.steps.map((s, i) => [`${f.id}:${i + 1}`, `${f.title} — step ${i + 1}: ${s.tell}`]))),
).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(APP_NAME)} walkthrough</title>
<style>
  :root { --bg: #fff; --fg: #1a1a1a; --muted: #555; --line: #ddd; --good: #1a7f37; --bad: #b42318; }
  @media (prefers-color-scheme: dark) { :root { --bg: #111; --fg: #eee; --muted: #aaa; --line: #333; --good: #4ac26b; --bad: #ff7b72; } }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 18px/1.5 system-ui, sans-serif; }
  main { max-width: 44rem; margin: 0 auto; padding: 1rem; }
  .bar { position: sticky; top: 0; z-index: 1; background: var(--bg); border-bottom: 1px solid var(--line); padding: .5rem 0; display: flex; gap: 1rem; align-items: center; justify-content: space-between; }
  section { border-top: 2px solid var(--line); margin-top: 2rem; }
  .chapter { border-top: 4px solid var(--fg); margin-top: 3rem; padding-top: .5rem; }
  ol { padding: 0; list-style: none; }
  .step { border: 1px solid var(--line); border-radius: 8px; padding: 1rem; margin: 1rem 0; }
  img { width: 100%; max-width: 390px; border: 1px solid var(--line); display: block; margin: .5rem 0; }
  .meta, .missing { color: var(--muted); }
  .good { color: var(--good); } .bad { color: var(--bad); }
  fieldset { border: 0; padding: 0; } fieldset label { margin-right: 1rem; }
  .note { display: block; margin-top: .5rem; } textarea { width: 100%; font: inherit; }
  button { font: inherit; padding: .5rem 1rem; white-space: nowrap; }
</style>
</head>
<body>
<main>
<header>
  <h1>${esc(APP_NAME)}: walk through every flow</h1>
  <p>Go step by step. Do what each step says in the app, compare with the picture, and mark it. Your marks are kept in this browser.</p>
</header>
<div class="bar"><span id="progress"></span> <button type="button" id="copy">Copy my review</button></div>
${sections.join('\n')}
<section aria-labelledby="review-heading">
  <h2 id="review-heading">Your review</h2>
  <label for="review">Paste this back to whoever is building.</label>
  <textarea id="review" rows="10" readonly></textarea>
</section>
</main>
<script>
  const STEPS = ${flowIndex};
  const STORE = 'walkthrough:${esc(APP_NAME)}';
  let marks = {};
  try { marks = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch {}
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(marks)); } catch {} };
  const sets = [...document.querySelectorAll('fieldset[data-key]')];
  function render() {
    const done = sets.filter((f) => marks[f.dataset.key]?.verdict).length;
    document.getElementById('progress').textContent = done + ' of ' + sets.length + ' steps checked.';
    const off = Object.entries(marks).filter(([, m]) => m.verdict === 'off');
    const lines = ['Walkthrough review: ' + done + ' of ' + sets.length + ' steps checked, ' + off.length + ' off.', ''];
    for (const [key, m] of off) lines.push('- ' + (STEPS[key] || key) + (m.note ? ' — ' + m.note : ''));
    if (!off.length) lines.push('Everything I checked works.');
    document.getElementById('review').value = lines.join('\\n');
  }
  for (const f of sets) {
    const key = f.dataset.key, m = marks[key] || {};
    const note = f.querySelector('textarea');
    if (m.verdict) f.querySelector('input[value="' + m.verdict + '"]').checked = true;
    note.value = m.note || '';
    f.addEventListener('change', (e) => {
      if (e.target.type === 'radio') { marks[key] = { ...marks[key], verdict: e.target.value }; save(); render(); }
    });
    note.addEventListener('input', () => { marks[key] = { ...marks[key], note: note.value }; save(); render(); });
  }
  document.getElementById('copy').addEventListener('click', async () => {
    const text = document.getElementById('review').value;
    try { await navigator.clipboard.writeText(text); } catch { document.getElementById('review').select(); }
  });
  render();
</script>
</body>
</html>
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'index.html'), html);
console.log(`wrote ${OUT}/index.html — ${FLOWS.length} flows, ${failed} did not run end to end`);
process.exit(failed ? 1 : 0);
