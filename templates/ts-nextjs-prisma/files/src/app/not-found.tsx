import Link from 'next/link';

// Branded 404: unknown paths get a way home, not the default Next.js screen.
export default function NotFound() {
  return (
    <div className="space-y-4 py-12 text-center">
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="text-neutral-600 dark:text-neutral-400">Nothing exists at this address.</p>
      <p>
        <Link href="/" className="underline">
          Back to the home page
        </Link>
      </p>
    </div>
  );
}
