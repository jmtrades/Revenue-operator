import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Page not found
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          This page doesn’t exist or was moved. Go back home or try the main menu.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--accent-primary)", color: "var(--text-inverse)", border: "none" }}
          >
            Go home
          </Link>
          <Link
            href="/contact"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
