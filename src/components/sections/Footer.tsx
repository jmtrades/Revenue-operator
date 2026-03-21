"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  const linkStyle = { color: "var(--text-tertiary)" };
  const linkClass = "block text-[13px] py-1 no-underline transition-colors hover:text-[var(--text-primary)]";

  return (
    <footer
      className="py-16 px-6"
      style={{
        background: "var(--bg-primary)",
        borderTop: "1px solid var(--border-default)",
      }}
    >
      <Container>
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3 pr-4">
            <span className="text-[15px] font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Recall Touch
            </span>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              {t("tagline")}
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
              {t("product")}
            </p>
            <nav className="space-y-0.5">
              <Link href={ROUTES.PRODUCT} className={linkClass} style={linkStyle}>{t("features")}</Link>
              <Link href={ROUTES.PRICING} className={linkClass} style={linkStyle}>{t("pricing")}</Link>
              <Link href="/demo" className={linkClass} style={linkStyle}>{t("demo")}</Link>
              <Link href="/outbound" className={linkClass} style={linkStyle}>Outbound</Link>
              <Link href="/enterprise" className={linkClass} style={linkStyle}>Enterprise</Link>
              <Link href={ROUTES.DOCS} className={linkClass} style={linkStyle}>{t("docs")}</Link>
            </nav>
          </div>

          {/* Industries */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
              Industries
            </p>
            <nav className="space-y-0.5">
              {[
                ["Dental", "/industries/dental"],
                ["Healthcare", "/industries/healthcare"],
                ["Legal", "/industries/legal"],
                ["Real Estate", "/industries/real-estate"],
                ["Plumbing & HVAC", "/industries/plumbing-hvac"],
                ["Insurance", "/industries/insurance"],
                ["Med Spa", "/industries/med-spa"],
              ].map(([label, href]) => (
                <Link key={href} href={href} className={linkClass} style={linkStyle}>{label}</Link>
              ))}
            </nav>
          </div>

          {/* Company */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
              {t("company")}
            </p>
            <nav className="space-y-0.5">
              <a href="mailto:team@recall-touch.com" className={linkClass} style={linkStyle}>{t("emailUs")}</a>
              <Link href="/blog" className={linkClass} style={linkStyle}>{t("blog")}</Link>
              <Link href="/contact" className={linkClass} style={linkStyle}>{t("contact")}</Link>
              <Link href="/results" className={linkClass} style={linkStyle}>Results</Link>
              <Link href="/security" className={linkClass} style={linkStyle}>Security</Link>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
              {t("legalSecurity")}
            </p>
            <nav className="space-y-0.5">
              <Link href="/privacy" className={linkClass} style={linkStyle}>{t("privacyPolicy")}</Link>
              <Link href="/terms" className={linkClass} style={linkStyle}>{t("termsOfService")}</Link>
              <a href="https://status.recall-touch.com" target="_blank" rel="noopener noreferrer" className={linkClass} style={linkStyle}>System Status</a>
            </nav>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {["SOC 2", "HIPAA", "GDPR", "SSL"].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    border: "1px solid var(--border-default)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: "1px solid var(--border-default)" }}
        >
          <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            {t("copyright", { year })}
          </p>
        </div>
      </Container>
    </footer>
  );
}
