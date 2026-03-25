"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetch("/api/admin/check", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAllowed(d.allowed === true))
      .catch(() => setAllowed(false));
  }, []);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Checking access…</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-sm text-center max-w-md" style={{ color: "var(--text-secondary)" }}>
          This area is for Recall Touch administrators only. Sign in with the admin account or contact support.
        </p>
        <Link href="/" className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>← Back to home</Link>
      </div>
    );
  }

  const nav = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/signups", label: "Users & Signups" },
    { href: "/admin/businesses", label: "Businesses" },
    { href: "/admin/calls", label: "Calls & Quality" },
    { href: "/admin/revenue", label: "Revenue" },
    { href: "/admin/funnel", label: "Funnel & Growth" },
    { href: "/admin/benchmarks", label: "Benchmarks" },
    { href: "/admin/system", label: "System" },
    { href: "/admin/export", label: "Data Export" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <aside
        className={`${sidebarOpen ? "w-full md:w-60" : "w-0 md:w-16"} border-b md:border-b-0 md:border-r transition-[width] duration-200 shrink-0 overflow-hidden`}
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            {sidebarOpen && <h2 className="text-xs font-semibold tracking-wider">ADMIN</h2>}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded hover:opacity-70 transition-opacity hidden md:block text-xs"
              title={sidebarOpen ? "Collapse" : "Expand"}
              style={{ color: "var(--text-secondary)" }}
            >
              {sidebarOpen ? "−" : "+"}
            </button>
          </div>
          <nav className="space-y-1">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block py-2 text-xs rounded-md px-2 transition-colors ${!sidebarOpen && 'md:text-center'}`}
                style={{
                  color: pathname === href ? "var(--accent-primary)" : "var(--text-secondary)",
                  background: pathname === href ? "var(--accent-primary-subtle)" : "transparent",
                }}
                title={!sidebarOpen ? label : undefined}
              >
                {sidebarOpen ? label : label.charAt(0)}
              </Link>
            ))}
          </nav>
          {sidebarOpen && (
            <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--border-default)" }}>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Last updated<br />{lastUpdated}
              </p>
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main>
    </div>
  );
}
