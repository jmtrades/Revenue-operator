"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export function Footer() {
  const t = useTranslations("footer");
  const tMarketing = useTranslations("marketing.footer");
  const year = new Date().getFullYear();

  const linkStyle = { color: "var(--text-tertiary)" };
  const linkClass = "block text-[13px] py-1 px-2 no-underline rounded-md hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]";
  const linkTransition = { transition: "color 200ms cubic-bezier(0.23, 1, 0.32, 1), background-color 200ms cubic-bezier(0.23, 1, 0.32, 1)" };

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
              Revenue Operator
            </span>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              {t("tagline")}
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--accent-primary)" }}>
              {t("product")}
            </p>
            <nav className="space-y-1.5">
              <Link href={ROUTES.PRODUCT} className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{t("features")}</Link>
              <Link href={ROUTES.PRICING} className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{t("pricing")}</Link>
              <Link href="/demo" className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{t("demo")}</Link>
              <Link href="/outbound" className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{tMarketing("outbound")}</Link>
              <Link href="/enterprise" className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{tMarketing("enterprise")}</Link>
              <Link href={ROUTES.DOCS} className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{t("docs")}</Link>
            </nav>
          </div>

          {/* Industries */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--accent-primary)" }}>
              {tMarketing("industries")}
            </p>
            <nav className="space-y-1.5">
              {[
                [tMarketing("dental"), "/industries/dental"],
                [tMarketing("healthcare"), "/industries/healthcare"],
                [tMarketing("legal"), "/industries/legal"],
                [tMarketing("realEstate"), "/industries/real-estate"],
                [tMarketing("plumbingHvac"), "/industries/plumbing-hvac"],
                [tMarketing("insurance"), "/industries/insurance"],
                [tMarketing("autoRepair"), "/industries/auto-repair"],
                [tMarketing("construction"), "/industries/construction"],
                [tMarketing("medSpa"), "/industries/med-spa"],
                [tMarketing("recruiting"), "/industries/recruiting"],
                [tMarketing("roofing"), "/industries/roofing"],
              ].map(([label, href]) => (
                <Link key={href} href={href} className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{label}</Link>
              ))}
            </nav>
          </div>

          {/* Company */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--accent-primary)" }}>
              {t("company")}
            </p>
            <nav className="space-y-1.5">
              <a href="mailto:team@recall-touch.com" className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{t("emailUs")}</a>
              <Link href="/blog" className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{t("blog")}</Link>
              <Link href="/contact" className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{t("contact")}</Link>
              <Link href="/results" className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{tMarketing("results")}</Link>
              <Link href="/security" className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{tMarketing("security")}</Link>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--accent-primary)" }}>
              {t("legalSecurity")}
            </p>
            <nav className="space-y-1.5">
              <Link href="/privacy" className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{t("privacyPolicy")}</Link>
              <Link href="/terms" className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{t("termsOfService")}</Link>
              <a href="https://status.recall-touch.com" target="_blank" rel="noopener noreferrer" className={linkClass} style={{ ...linkStyle, ...linkTransition }}>{tMarketing("systemStatus")}</a>
            </nav>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {["SOC 2", "HIPAA", "GDPR", "SSL"].map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    border: "1px solid var(--border-default)",
                    color: "var(--text-tertiary)",
                    background: "var(--accent-primary-subtle)",
                    transition: "color 200ms cubic-bezier(0.23, 1, 0.32, 1), background-color 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms cubic-bezier(0.23, 1, 0.32, 1)"
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
