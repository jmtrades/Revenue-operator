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
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Recall Touch
            </span>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              AI phone system that answers, qualifies, and books calls for your business 24/7.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Product
            </p>
            <Link href={ROUTES.PRODUCT} className="block hover:opacity-80 transition-opacity">
              Features
            </Link>
            <Link href={ROUTES.PRICING} className="block hover:opacity-80 transition-opacity">
              Pricing
            </Link>
            <Link href="/demo" className="block hover:opacity-80 transition-opacity">
              Demo
            </Link>
            <Link href={ROUTES.DOCS} className="block hover:opacity-80 transition-opacity">
              Docs
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Company
            </p>
            <a href="mailto:team@recall-touch.com" className="block hover:opacity-80 transition-opacity">
              Contact
            </a>
            <Link href="/blog" className="block hover:opacity-80 transition-opacity">
              Blog
            </Link>
            <Link href="/contact" className="block hover:opacity-80 transition-opacity">
              About
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Legal & security
            </p>
            <Link href="/privacy" className="block hover:opacity-80 transition-opacity">
              Privacy Policy
            </Link>
            <Link href="/terms" className="block hover:opacity-80 transition-opacity">
              Terms of Service
            </Link>
            <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
              SOC 2 • GDPR • 256-bit encryption
            </p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            © {year} Recall Touch. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
