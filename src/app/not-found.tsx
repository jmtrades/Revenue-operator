import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--bg-base)]">
      <div className="max-w-md w-full text-center">
        <p className="text-6xl font-bold mb-2 text-white">404</p>
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Page not found</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">This page doesn’t exist.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/"
            aria-label="Go to homepage"
            className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none transition"
          >
            Go home
          </Link>
          <Link
            href="/contact"
            aria-label="Contact support"
            className="px-6 py-3 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none transition"
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
