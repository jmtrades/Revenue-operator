"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export function Footer() {
  const t = useTranslations("footer");
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
              {t("tagline")}
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("product")}
            </p>
            <Link href={ROUTES.PRODUCT} className="block hover:opacity-80 transition-opacity">
              {t("features")}
            </Link>
            <Link href={ROUTES.PRICING} className="block hover:opacity-80 transition-opacity">
              {t("pricing")}
            </Link>
            <Link href="/demo" className="block hover:opacity-80 transition-opacity">
              {t("demo")}
            </Link>
            <Link href={ROUTES.DOCS} className="block hover:opacity-80 transition-opacity">
              {t("docs")}
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("company")}
            </p>
            <a href="mailto:team@recall-touch.com" className="block hover:opacity-80 transition-opacity">
              {t("emailUs")}
            </a>
            <Link href="/blog" className="block hover:opacity-80 transition-opacity">
              {t("blog")}
            </Link>
            <Link href="/contact" className="block hover:opacity-80 transition-opacity">
              {t("contact")}
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {t("legalSecurity")}
            </p>
            <Link href="/privacy" className="block hover:opacity-80 transition-opacity">
              {t("privacyPolicy")}
            </Link>
            <Link href="/terms" className="block hover:opacity-80 transition-opacity">
              {t("termsOfService")}
            </Link>
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                { label: "SOC 2", icon: "🛡️" },
                { label: "256-bit SSL", icon: "🔒" },
                { label: "GDPR", icon: "🔐" },
                { label: "99.9% Uptime", icon: "✓" },
              ].map((badge) => (
                <span
                  key={badge.label}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border"
                  style={{
                    borderColor: "var(--border-default)",
                    color: "var(--text-tertiary)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <span aria-hidden>{badge.icon}</span>
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {t("copyright", { year })}
          </p>
        </div>
      </Container>
    </footer>
  );
}
