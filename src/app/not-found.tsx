import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-black" style={{ color: "var(--text-primary)" }}>
      <div className="max-w-md w-full text-center">
        <p className="text-6xl font-bold mb-2 text-white">404</p>
        <h1 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Page not found
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          This page doesn’t exist.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl text-sm font-medium bg-white text-black font-semibold hover:bg-zinc-200 transition"
          >
            Go home →
          </Link>
          <Link
            href="/contact"
            className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-900 border border-zinc-700 text-white hover:border-zinc-500 transition"
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
