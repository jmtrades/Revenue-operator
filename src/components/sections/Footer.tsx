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
            <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: 14 }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full border flex items-center justify-center shrink-0"
                  style={{
                    borderColor: "var(--border-default)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 64 64"
                    role="img"
                    aria-label={t("founderPhotoAlt")}
                  >
                    <path
                      d="M32 34c8 0 15-6.2 15-14 0-8-7-14-15-14S17 12 17 20c0 7.8 7 14 15 14Z"
                      fill="var(--text-primary)"
                      opacity="0.9"
                    />
                    <path
                      d="M12 60c2-14 11-22 20-22s18 8 20 22H12Z"
                      fill="var(--accent-primary)"
                      opacity="0.35"
                    />
                    <text
                      x="32"
                      y="38"
                      textAnchor="middle"
                      fontSize="22"
                      fontFamily="ui-sans-serif, system-ui"
                      fill="var(--text-primary)"
                      opacity="0.95"
                      fontWeight="700"
                    >
                      J
                    </text>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {t("founderName")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)", lineHeight: 1.4 }}>
                    {t("founderBio")}
                  </p>
                </div>
              </div>
            </div>
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
            <Link href="/results" className="block hover:opacity-80 transition-opacity">
              Results
            </Link>
            <Link href="/security" className="block hover:opacity-80 transition-opacity">
              Security
            </Link>
            <Link href="/outbound" className="block hover:opacity-80 transition-opacity">
              Outbound
            </Link>
            <Link href="/enterprise" className="block hover:opacity-80 transition-opacity">
              Enterprise
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
            <div className="pt-2">
              <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                Industries
              </p>
              <div className="mt-2 space-y-1">
                <Link href="/industries/plumbing-hvac" className="block hover:opacity-80 transition-opacity">
                  Plumbing & HVAC
                </Link>
                <Link href="/industries/dental" className="block hover:opacity-80 transition-opacity">
                  Dental
                </Link>
                <Link href="/industries/legal" className="block hover:opacity-80 transition-opacity">
                  Legal
                </Link>
                <Link href="/industries/real-estate" className="block hover:opacity-80 transition-opacity">
                  Real Estate
                </Link>
                <Link href="/industries/healthcare" className="block hover:opacity-80 transition-opacity">
                  Healthcare
                </Link>
                <Link href="/industries/roofing" className="block hover:opacity-80 transition-opacity">
                  Roofing
                </Link>
                <Link href="/industries/med-spa" className="block hover:opacity-80 transition-opacity">
                  Med Spa
                </Link>
                <Link href="/industries/recruiting" className="block hover:opacity-80 transition-opacity">
                  Recruiting
                </Link>
                <Link href="/industries/auto-repair" className="block hover:opacity-80 transition-opacity">
                  Auto Repair
                </Link>
                <Link href="/industries/insurance" className="block hover:opacity-80 transition-opacity">
                  Insurance
                </Link>
                <Link href="/industries/construction" className="block hover:opacity-80 transition-opacity">
                  Construction
                </Link>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                Resources
              </p>
              <div className="mt-2 space-y-1">
                <Link href="/demo" className="block hover:opacity-80 transition-opacity">
                  Live Demo
                </Link>
                <Link href="/demo/voice" className="block hover:opacity-80 transition-opacity">
                  Voice Library
                </Link>
                <Link href="/pricing" className="block hover:opacity-80 transition-opacity">
                  Pricing
                </Link>
                <Link href="/contact" className="block hover:opacity-80 transition-opacity">
                  Contact Sales
                </Link>
              </div>
            </div>
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
            <Link href="/status" className="block hover:opacity-80 transition-opacity">
              System Status
            </Link>
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                { label: "256-bit SSL", icon: "" },
                { label: "GDPR-ready", icon: "" },
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
