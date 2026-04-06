"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { getAllIndustries } from "@/lib/data/industries";
import { ROUTES } from "@/lib/constants";
import * as LucideIcons from "lucide-react";

type IconName = keyof typeof LucideIcons;

function getIconComponent(iconName: string) {
  const Icon = LucideIcons[iconName as IconName] as React.ComponentType<{ className?: string }> | undefined;
  return Icon ? <Icon className="w-8 h-8" /> : null;
}

const BASE = "https://www.recall-touch.com";

export default function IndustriesPageContent({
  initialAuthenticated = false,
}: {
  initialAuthenticated?: boolean;
}) {
  const t = useTranslations("industriesPage");
  const industries = getAllIndustries();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
      { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
    ],
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Navbar initialAuthenticated={initialAuthenticated} />
      <main className="pt-28 pb-20">
        <Container>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="section-label mb-4" style={{ color: "var(--accent-primary)" }}>
                {t("heading.label")}
              </p>
              <h1 className="font-bold mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                {t("heading.title")}
              </h1>
              <p className="text-base md:text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {t("heading.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {industries.map((industry) => (
                <Link key={industry.slug} href={`/industries/${industry.slug}`} className="group">
                  <div
                    className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 h-full flex flex-col hover:border-[var(--accent-primary)] hover:shadow-lg"
                    style={{
                      borderColor: "var(--border-default)",
                      boxShadow: "none",
                      transition: "border-color 0.3s ease-[cubic-bezier(0.23,1,0.32,1)], box-shadow 0.3s ease-[cubic-bezier(0.23,1,0.32,1)]",
                    } as React.CSSProperties}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold group-hover:text-[var(--accent-primary)] transition-colors">
                        {industry.name}
                      </h3>
                      <div style={{ color: "var(--accent-primary)" }}>
                        {getIconComponent(industry.heroIcon)}
                      </div>
                    </div>
                    <p className="text-sm mb-3 flex-grow" style={{ color: "var(--text-secondary)" }}>
                      {industry.customerType &&
                        `AI-powered revenue operations for ${industry.customerType} — calls, bookings, follow-ups, campaigns, and recovery.`}
                    </p>
                    <div className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--accent-primary)" }}>
                      Learn more →
                    </div>
                  </div>
                </Link>
              ))}

              {/* CTA Card */}
              <div
                className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 flex flex-col justify-center items-center text-center"
                style={{
                  background: "linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)",
                }}
              >
                <h3 className="text-lg font-semibold mb-3">
                  {t("cta.title")}
                </h3>
                <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                  {t("cta.description")}
                </p>
                <Link
                  href={ROUTES.START}
                  className="btn-marketing-primary inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold no-underline text-sm active:scale-[0.97]"
                  style={{
                    transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]",
                  }}
                >
                  Get started →
                </Link>
              </div>
            </div>

            {/* Additional CTA Section */}
            <div className="mt-12 pt-8 border-t border-[var(--border-default)]">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-4">
                  {t("bottomCta.title")}
                </h2>
                <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
                  {t("bottomCta.description")}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href={ROUTES.START} className="btn-marketing-primary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                    Get started →
                  </Link>
                  <Link href="/demo" className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline active:scale-[0.97]" style={{ transition: "transform 0.15s ease-[cubic-bezier(0.23,1,0.32,1)]" }}>
                    Watch the demo →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
