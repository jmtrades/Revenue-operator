"use client";

import Link from "next/link";

/**
 * Minimal top nav: Recall Touch, Product, Pricing, Documentation, Sign in, Start free.
 */
export function AuthorityNav() {
  return (
    <nav className="border-b py-4 px-6 sm:px-8" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-[1100px] mx-auto flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-[13px] font-medium uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>
          Recall Touch
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/product" className="text-[13px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Product</Link>
          <Link href="/pricing" className="text-[13px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Pricing</Link>
          <Link href="/docs" className="text-[13px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Documentation</Link>
          <Link href="/dashboard/start" className="text-[13px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Sign in</Link>
          <Link href="/activate" className="text-[13px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-primary)" }}>Start free</Link>
        </div>
      </div>
    </nav>
  );
}
