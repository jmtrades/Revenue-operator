"use client";

import Link from "next/link";

/**
 * Minimal top nav: Recall Touch, Pricing, Declare, Start.
 */
export function AuthorityNav() {
  return (
    <nav className="border-b py-4 px-6 sm:px-8" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-[1100px] mx-auto flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>
          Recall Touch
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="text-[13px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Pricing</Link>
          <Link href="/declare" className="text-[13px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Declare</Link>
          <Link href="/dashboard/start" className="text-[13px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Start</Link>
        </div>
      </div>
    </nav>
  );
}
