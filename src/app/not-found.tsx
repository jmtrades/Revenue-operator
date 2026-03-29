import Link from "next/link";

export const metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-6xl font-bold text-[var(--text-primary)] mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">Page not found</h2>
        <p className="text-[var(--text-secondary)] mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-[var(--accent-primary)] hover:opacity-90 text-[var(--text-on-accent)] font-medium rounded-lg transition-colors"
          >
            Back to homepage
          </Link>
          <Link
            href="/app/dashboard"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-inset)] text-[var(--text-primary)] font-medium rounded-lg transition-colors border border-[var(--border-default)]"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
