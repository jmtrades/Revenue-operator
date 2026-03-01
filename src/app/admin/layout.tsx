"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/admin/check", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAllowed(d.allowed === true))
      .catch(() => setAllowed(false));
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
    { href: "/admin/signups", label: "Signups" },
    { href: "/admin/businesses", label: "Businesses" },
    { href: "/admin/calls", label: "Calls" },
    { href: "/admin/revenue", label: "Revenue" },
    { href: "/admin/system", label: "System" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <aside className="w-full md:w-56 border-b md:border-b-0 md:border-r p-4 shrink-0" style={{ borderColor: "var(--border-default)" }}>
        <h2 className="text-sm font-semibold mb-4">RECALL TOUCH ADMIN</h2>
        <nav className="space-y-1">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block py-2 text-sm rounded-md px-2"
              style={{
                color: pathname === href ? "var(--accent-primary)" : "var(--text-secondary)",
                background: pathname === href ? "var(--accent-primary-subtle)" : "transparent",
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main>
    </div>
  );
}
