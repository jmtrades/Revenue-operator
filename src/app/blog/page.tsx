import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MarketingNavbar } from "@/components/sections/MarketingNavbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Blog — Revenue Operator",
  description:
    "Insights on AI phone agents, revenue operations, call handling, and growth strategies for service businesses.",
  openGraph: {
    title: "Blog — Revenue Operator",
    description:
      "Guides, playbooks, and insights on AI phone agents, revenue recovery, and growth for service businesses.",
    url: "https://www.recall-touch.com/blog",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — Revenue Operator",
    description:
      "Guides and insights on AI phone agents and revenue recovery.",
  },
};

const TOPIC_KEYS = ["0", "1", "2", "3", "4", "5"] as const;

export default async function ResourcesPage() {
  const t = await getTranslations("blogPage");

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Revenue Operator Blog",
    headline: t("heading"),
    description: t("subheading"),
    url: `${BASE}/blog`,
    publisher: {
      "@type": "Organization",
      name: "Revenue Operator",
      url: BASE,
    },
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <MarketingNavbar />
      <main className="pt-28 pb-24">
        <Container>
          <div className="max-w-3xl mb-16">
            <p className="section-label mb-2">{t("sectionLabel")}</p>
            <h1 className="font-bold text-3xl md:text-4xl mb-4" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {t("heading")}
            </h1>
            <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
              {t("subheading")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {TOPIC_KEYS.map((key) => (
              <div
                key={key}
                className="rounded-xl border p-6"
                style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
              >
                <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                  {t(`topics.${key}.title`)}
                </h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {t(`topics.${key}.description`)}
                </p>
              </div>
            ))}
          </div>

          <div
            className="max-w-2xl mx-auto rounded-2xl border p-8"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            <h2 className="font-semibold text-2xl mb-3" style={{ color: "var(--text-primary)" }}>
              {t("newsletterTitle")}
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {t("newsletterDesc")}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder={t("emailPlaceholder")}
                className="flex-1 px-4 py-3 rounded-lg border text-sm"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                type="button"
                className="px-6 py-3 rounded-lg font-semibold whitespace-nowrap"
                style={{ background: "var(--accent-primary)", color: "white" }}
              >
                {t("subscribe")}
              </button>
            </div>
          </div>

          <div className="mt-16 pt-12 border-t text-center" style={{ borderColor: "var(--border-default)" }}>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
              {t("ctaLine")}
            </p>
            <Link href={ROUTES.START} className="btn-marketing-primary no-underline inline-block">
              {t("ctaButton")}
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
