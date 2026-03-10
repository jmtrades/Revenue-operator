"use client";

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="border-t py-12 px-6"
      style={{ background: "var(--bg-primary)", borderColor: "var(--border-default)" }}
    >
      <Container>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            Recall Touch
          </span>
          <div className="flex gap-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
            <Link href={ROUTES.PRODUCT} className="hover:opacity-80 transition-opacity">
              Product
            </Link>
            <Link href={ROUTES.PRICING} className="hover:opacity-80 transition-opacity">
              Pricing
            </Link>
            <Link href={ROUTES.DOCS} className="hover:opacity-80 transition-opacity">
              Docs
            </Link>
            <a href="mailto:team@recall-touch.com" className="hover:opacity-80 transition-opacity">
              Contact
            </a>
          </div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            © {year} Recall Touch
          </p>
        </div>
      </Container>
    </footer>
  );
}
