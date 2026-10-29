'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Flow, FlowAction } from '@/flows/flows';
import { emptyReview, progress, reviewMarkdown, stepKey, type Review, type Verdict } from '@/flows/review';

// The live walkthrough: a guide panel over the real app. It walks a reviewer
// through every flow in src/flows/flows.ts, outlines what to press, asks them to
// try to break each flow, and saves their review (walkthrough/review.md via
// /api/walkthrough). Mounted by the root layout only when walkthroughProblem()
// is null — never in production.

type Phase = 'steps' | 'break' | 'done';
interface Position {
  flow: number;
  step: number;
  phase: Phase;
}

const POSITION = 'walkthrough:position';
const REVIEW = 'walkthrough:review';
const OUTLINE = '3px dashed #d97706';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function keep(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private window or blocked storage: the walkthrough still works, it just won't survive a reload.
  }
}

/** The element a step is about: the field with this label, or the button/link with this name. */
function targetOf(action: FlowAction): HTMLElement | null {
  if ('goto' in action) return null;
  if ('fill' in action) {
    const label = [...document.querySelectorAll('label')].find((l) => l.textContent?.trim() === action.fill);
    return label ? (document.getElementById(label.htmlFor) ?? label.querySelector('input, textarea, select')) : null;
  }
  return (
    [...document.querySelectorAll<HTMLElement>('button, a')].find(
      (el) => !el.closest('[data-walkthrough-panel]') && (el.textContent?.trim() === action.click || el.getAttribute('aria-label') === action.click),
    ) ?? null
  );
}

const button = 'rounded border border-neutral-400 px-3 py-1 aria-pressed:bg-neutral-900 aria-pressed:text-white dark:aria-pressed:bg-neutral-100 dark:aria-pressed:text-neutral-900';
const primary = 'rounded bg-neutral-900 px-3 py-1 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900';
const field = 'mt-1 block w-full rounded border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-900';

export function WalkthroughPanel({ flows }: { flows: Flow[] }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(true);
  const [pos, setPos] = useState<Position>({ flow: 0, step: 0, phase: 'steps' });
  const [review, setReview] = useState<Review>(emptyReview);
  const [saved, setSaved] = useState<'idle' | 'saved' | 'copy'>('idle');
  const [extraNote, setExtraNote] = useState('');
  const first = useRef(true);
  const latest = useRef<{ review: Review; dirty: boolean }>({ review: emptyReview(), dirty: false });
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    setPos(load(POSITION, { flow: 0, step: 0, phase: 'steps' }));
    setReview(load(REVIEW, emptyReview()));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) keep(POSITION, pos);
  }, [pos, ready]);

  // Keep the review in the browser and, debounced, in walkthrough/review.md.
  useEffect(() => {
    if (!ready) return;
    keep(REVIEW, review);
    latest.current.review = review;
    if (first.current) {
      first.current = false;
      return;
    }
    latest.current.dirty = true;
    const timer = setTimeout(() => {
      latest.current.dirty = false;
      fetch('/api/walkthrough', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(review) })
        .then((r) => r.json() as Promise<{ saved: boolean }>)
        .then((r) => setSaved(r.saved ? 'saved' : 'copy'))
        .catch(() => setSaved('copy'));
    }, 600);
    return () => clearTimeout(timer);
  }, [review, ready]);

  // A note typed just before a reload or a closed tab still reaches the file.
  useEffect(() => {
    const flush = () => {
      if (!latest.current.dirty) return;
      latest.current.dirty = false;
      navigator.sendBeacon?.('/api/walkthrough', new Blob([JSON.stringify(latest.current.review)], { type: 'application/json' }));
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  // Room under the page for the panel, so the app's own content can scroll clear of it.
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const fit = () => {
      document.body.style.paddingBottom = `${el.offsetHeight + 80}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.body.style.paddingBottom = '';
    };
  }, [ready]);

  const flow = flows[pos.flow] ?? flows[0];
  const step = pos.phase === 'steps' ? flow?.steps[pos.step] : undefined;

  // Outline what the step is about; re-found as the page changes under it.
  useEffect(() => {
    if (!step || !open) return;
    let current: HTMLElement | null = null;
    const mark = () => {
      const next = targetOf(step.action);
      if (next === current) return;
      if (current) current.style.outline = '';
      current = next;
      if (current) {
        current.style.outline = OUTLINE;
        current.style.outlineOffset = '3px';
      }
    };
    mark();
    const timer = setInterval(mark, 500);
    return () => {
      clearInterval(timer);
      if (current) current.style.outline = '';
    };
  }, [step, open, pathname]);

  if (!ready || !flow) return null;

  const { checked, total, off } = progress(flows, review);
  const key = stepKey(flow.id, pos.step + 1);
  const mark = review.marks[key] ?? {};
  const setMark = (patch: { verdict?: Verdict; note?: string }) =>
    setReview((r) => ({ ...r, marks: { ...r.marks, [key]: { ...r.marks[key], ...patch } } }));
  const isLastFlow = pos.flow === flows.length - 1;
  const next = () =>
    setPos((p) =>
      p.phase === 'steps'
        ? p.step + 1 < flow.steps.length
          ? { ...p, step: p.step + 1 }
          : { ...p, phase: 'break' }
        : isLastFlow
          ? { ...p, phase: 'done' }
          : { flow: p.flow + 1, step: 0, phase: 'steps' },
    );
  const back = () =>
    setPos((p) => (p.phase === 'break' ? { ...p, phase: 'steps', step: flow.steps.length - 1 } : { ...p, step: Math.max(0, p.step - 1) }));
  const copy = () => navigator.clipboard?.writeText(reviewMarkdown(flows, review)).catch(() => undefined);

  return (
    <aside
      ref={panel}
      data-walkthrough-panel
      aria-label="Walkthrough"
      className="fixed right-4 bottom-16 z-50 max-h-[45vh] sm:bottom-4 sm:max-h-[70vh] w-[calc(100%-2rem)] max-w-sm overflow-auto rounded-lg border border-neutral-300 bg-white p-4 text-base shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Walkthrough · {checked} of {total} steps checked{off ? ` · ${off} off` : ''}
          {saved === 'saved' ? ' · saved' : ''}
        </p>
        <button type="button" className={button} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide' : 'Show'}
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="walkthrough-flow" className="block text-sm font-medium">
              Flow {pos.flow + 1} of {flows.length}
            </label>
            <select
              id="walkthrough-flow"
              className={field}
              value={pos.flow}
              onChange={(e) => setPos({ flow: Number(e.target.value), step: 0, phase: 'steps' })}
            >
              {flows.map((f, i) => (
                <option key={f.id} value={i}>
                  {f.title}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {flow.who} · {flow.why}
            </p>
          </div>

          {step ? (
            <div className="space-y-2">
              <p>
                <strong>
                  Step {pos.step + 1} of {flow.steps.length}.
                </strong>{' '}
                {step.tell}
              </p>
              {'goto' in step.action && pathname !== step.action.goto ? (
                <Link href={step.action.goto} className="underline">
                  Take me there
                </Link>
              ) : null}
              <p>
                <strong>You should see:</strong> {step.see}
              </p>
              <div className="flex gap-2" role="group" aria-label="Does this step work?">
                <button type="button" className={button} aria-pressed={mark.verdict === 'works'} onClick={() => setMark({ verdict: 'works' })}>
                  Works
                </button>
                <button type="button" className={button} aria-pressed={mark.verdict === 'off'} onClick={() => setMark({ verdict: 'off' })}>
                  Something&apos;s off
                </button>
              </div>
              {mark.verdict === 'off' ? (
                <div>
                  <label htmlFor="walkthrough-off" className="block text-sm font-medium">
                    What&apos;s off?
                  </label>
                  <textarea id="walkthrough-off" rows={2} className={field} value={mark.note ?? ''} onChange={(e) => setMark({ note: e.target.value })} />
                </div>
              ) : null}
            </div>
          ) : null}

          {pos.phase === 'break' ? (
            <div className="space-y-2">
              <p>
                <strong>Now try to break it.</strong> The flow works on the happy path; what about these?
              </p>
              <ul className="list-disc pl-5">
                {flow.tryThis.map((t) => (
                  <li key={t}>{t}</li>
                ))}
                <li>Anything else a hurried or confused person might do.</li>
              </ul>
              <label htmlFor="walkthrough-found" className="block text-sm font-medium">
                What did you find?
              </label>
              <textarea
                id="walkthrough-found"
                rows={3}
                className={field}
                value={review.found[flow.id] ?? ''}
                onChange={(e) => setReview((r) => ({ ...r, found: { ...r.found, [flow.id]: e.target.value } }))}
              />
            </div>
          ) : null}

          {pos.phase === 'done' ? (
            <div className="space-y-2">
              <p>
                <strong>That&apos;s every flow.</strong> {off ? `${off} steps are off.` : 'Nothing marked off.'}{' '}
                {saved === 'copy' ? 'Copy your review and send it to whoever is building.' : 'Your review is saved for the builder.'}
              </p>
              <div className="flex gap-2">
                <button type="button" className={primary} onClick={copy}>
                  Copy my review
                </button>
                <button type="button" className={button} onClick={() => setPos({ flow: 0, step: 0, phase: 'steps' })}>
                  Start over
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button type="button" className={button} onClick={back} disabled={pos.phase === 'steps' && pos.step === 0}>
                Back
              </button>
              <button type="button" className={primary} onClick={next} disabled={pos.phase === 'steps' && !mark.verdict}>
                {pos.phase === 'steps' ? 'Next' : isLastFlow ? 'Finish' : 'Next flow'}
              </button>
            </div>
          )}

          <details>
            <summary className="cursor-pointer text-sm">Noticed something else?</summary>
            <label htmlFor="walkthrough-extra" className="mt-2 block text-sm font-medium">
              What did you notice on this page?
            </label>
            <textarea id="walkthrough-extra" rows={2} className={field} value={extraNote} onChange={(e) => setExtraNote(e.target.value)} />
            <button
              type="button"
              className={`${button} mt-2`}
              disabled={!extraNote.trim()}
              onClick={() => {
                setReview((r) => ({ ...r, extra: [...r.extra, { path: pathname, note: extraNote }] }));
                setExtraNote('');
              }}
            >
              Add to my review
            </button>
          </details>
        </div>
      ) : null}
    </aside>
  );
}
