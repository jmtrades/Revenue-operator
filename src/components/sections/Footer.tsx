"use client";

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { FOOTER_PRODUCT, FOOTER_COMPANY, FOOTER_LEGAL, FOOTER_SOLUTIONS } from "@/lib/constants";

export function Footer() {
  return (
    <footer
      className="border-t pt-16 pb-8"
      style={{ background: "var(--bg-primary)", borderColor: "var(--border-default)" }}
    >
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8" style={{ paddingBottom: "48px" }}>
          <div>
            <p className="font-semibold mb-3" style={{ color: "var(--text-primary)", fontSize: "17px" }}>Recall Touch</p>
            <p className="text-sm transition-colors duration-150" style={{ color: "var(--text-tertiary)", lineHeight: 1.5 }}>
              AI phone system for every business.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>Solutions</p>
            <ul className="space-y-2.5">
              {FOOTER_SOLUTIONS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm block transition-colors duration-150 hover:opacity-90" style={{ color: "var(--text-tertiary)" }}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>Product</p>
            <ul className="space-y-2.5">
              {FOOTER_PRODUCT.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm block transition-colors duration-150 hover:opacity-90" style={{ color: "var(--text-tertiary)" }}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>Company</p>
            <ul className="space-y-2.5">
              {FOOTER_COMPANY.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm block transition-colors duration-150 hover:opacity-90" style={{ color: "var(--text-tertiary)" }}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>Legal</p>
            <ul className="space-y-2.5">
              {FOOTER_LEGAL.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm block transition-colors duration-150 hover:opacity-90" style={{ color: "var(--text-tertiary)" }}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: "var(--border-default)" }}>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>© 2026 Recall Touch. All rights reserved.</p>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>AI phone system for every business.</p>
        </div>
      </Container>
    </footer>
  );
}
