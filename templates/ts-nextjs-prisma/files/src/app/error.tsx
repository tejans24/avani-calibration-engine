'use client';

// Branded failure page: users never see the raw Next.js digest screen. Error
// details stay in the server logs — the digest is the only safe thing to show.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4 py-12 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-neutral-600 dark:text-neutral-400">
        The error has been logged{error.digest ? ` (reference ${error.digest})` : ''}. Try again, or come back later.
      </p>
      <button type="button" onClick={reset} className="rounded border border-neutral-400 px-3 py-1">
        Try again
      </button>
    </div>
  );
}
