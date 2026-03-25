"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const nav = [
  { href: "/ops", label: "Overview" },
  { href: "/ops/workspaces", label: "Workspaces" },
  { href: "/ops/alerts", label: "Alerts" },
];

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex">
      <aside className="w-56 border-r border-stone-800 shrink-0 bg-stone-900/50">
        <div className="p-4 border-b border-stone-800">
          <h1 className="text-lg font-semibold text-rose-400">Ops</h1>
          <p className="text-xs text-stone-500 mt-0.5">Staff only · Internal</p>
        </div>
        <nav className="p-2 space-y-0.5">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`block px-3 py-2 rounded-lg text-sm ${
                pathname === n.href
                  ? "bg-rose-900/30 text-rose-400"
                  : "text-stone-400 hover:bg-stone-800 hover:text-stone-200"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-2 mt-4 border-t border-stone-800 space-y-2">
          <Link href="/dashboard" className="block text-xs text-stone-600 hover:text-stone-400">
            ← Customer app
          </Link>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/ops/auth/logout", { method: "POST", credentials: "include" });
              window.location.href = "/ops/login";
            }}
            className="text-xs text-stone-600 hover:text-stone-400"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="py-2 px-4 border-t border-stone-800 text-center text-xs text-stone-600">
          Staff only · Internal
        </footer>
      </main>
    </div>
  );
}
