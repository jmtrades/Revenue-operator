import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { MarketingNavbar } from "@/components/sections/MarketingNavbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { hreflangAlternateLanguages } from "@/lib/seo/hreflang";
import {
  AI_COMPETITORS,
  getAiCompetitor,
  type AiCompetitor,
} from "@/lib/data/ai-competitors";
import { ROUTES } from "@/lib/constants";

/**
 * Phase 92 — dynamic /compare/[competitor] for AI-voice-agent rivals.
 * Replaces the prior redirect-only stub. Bespoke compare pages
 * (smith-ai, ruby, gohighlevel, hiring-receptionist) take precedence
 * via Next.js routing because their explicit folders out-rank the
 * dynamic [competitor] segment.
 *
 * generateStaticParams pre-renders the four AI-voice-agent slugs at
 * build time so they ship as static pages with proper SEO + cache
 * behaviour, while still leaving the dynamic route to 404 cleanly on
 * any unknown slug.
 */

const BASE = "https://www.recall-touch.com";

export function generateStaticParams() {
  return AI_COMPETITORS.map((c) => ({ competitor: c.slug }));
}

interface PageProps {
  params: Promise<{ competitor: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { competitor: slug } = await params;
  const competitor = getAiCompetitor(slug);
  if (!competitor) {
    return {
      title: "Comparison not found",
      robots: { index: false },
    };
  }

  const title = `Revenue Operator vs ${competitor.name} — Revenue Operator`;
  const description = competitor.hook.slice(0, 158);

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE}/compare/${slug}`,
      languages: hreflangAlternateLanguages(`/compare/${slug}`),
    },
    openGraph: {
      title,
      description,
      url: `${BASE}/compare/${slug}`,
      siteName: "Revenue Operator",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function CompetitorMatrix({ competitor }: { competitor: AiCompetitor }) {
  return (
    <table className="w-full text-sm" cellPadding={0} cellSpacing={0}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
          <th
            className="text-left py-3 pr-4 font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            Capability
          </th>
          <th
            className="text-center py-3 px-3 font-semibold"
            style={{ color: "var(--accent-primary)" }}
          >
            Revenue Operator
          </th>
          <th
            className="text-center py-3 px-3 font-semibold"
            style={{ color: "var(--text-secondary)" }}
          >
            {competitor.name}
          </th>
        </tr>
      </thead>
      <tbody>
        {competitor.rows.map((row, idx) => (
          <tr
            key={idx}
            style={{
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <td className="py-3 pr-4 align-top" style={{ color: "var(--text-primary)" }}>
              <p className="font-medium">{row.feature}</p>
              {row.note && (
                <p
                  className="text-xs mt-0.5 leading-relaxed"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {row.note}
                </p>
              )}
            </td>
            <td className="py-3 px-3 text-center align-top">
              {row.ours ? (
                <CheckCircle2
                  className="w-5 h-5 inline"
                  style={{ color: "var(--accent-secondary)" }}
                  aria-label="Yes"
                />
              ) : (
                <XCircle
                  className="w-5 h-5 inline"
                  style={{ color: "var(--text-tertiary)" }}
                  aria-label="No"
                />
              )}
            </td>
            <td className="py-3 px-3 text-center align-top">
              {row.theirs ? (
                <CheckCircle2
                  className="w-5 h-5 inline"
                  style={{ color: "var(--accent-secondary)" }}
                  aria-label="Yes"
                />
              ) : (
                <XCircle
                  className="w-5 h-5 inline"
                  style={{ color: "var(--text-tertiary)" }}
                  aria-label="No"
                />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function CompetitorComparisonPage({ params }: PageProps) {
  const { competitor: slug } = await params;
  const competitor = getAiCompetitor(slug);
  if (!competitor) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
          { "@type": "ListItem", position: 2, name: "Comparisons", item: `${BASE}/compare` },
          {
            "@type": "ListItem",
            position: 3,
            name: competitor.name,
            item: `${BASE}/compare/${slug}`,
          },
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${BASE}/compare/${slug}`,
        url: `${BASE}/compare/${slug}`,
        name: `Revenue Operator vs ${competitor.name}`,
        description: competitor.hook.slice(0, 158),
        isPartOf: { "@type": "WebSite", name: "Revenue Operator", url: BASE },
      },
    ],
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <MarketingNavbar />
      <main className="pt-28 pb-24">
        <Container>
          <article className="max-w-3xl mx-auto">
            <p
              className="eyebrow-editorial mb-5"
              style={{ color: "var(--accent-primary)" }}
            >
              Comparison
            </p>
            <h1
              className="font-editorial mb-5"
              style={{
                fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
                color: "var(--text-primary)",
              }}
            >
              Revenue Operator vs <em className="ital">{competitor.name}</em>
            </h1>
            <p
              className="text-base md:text-lg mb-3 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {competitor.positioning}
            </p>
            <p
              className="text-base md:text-lg mb-8 leading-relaxed"
              style={{ color: "var(--text-primary)" }}
            >
              {competitor.hook}
            </p>
            <p
              className="text-xs mb-10"
              style={{ color: "var(--text-tertiary)" }}
            >
              {`Comparison as of ${new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}.`}{" "}
              {competitor.name} pricing and feature data sourced from{" "}
              <a
                href={competitor.pricingUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2"
                style={{ color: "inherit" }}
              >
                their public pricing page
              </a>
              . Capabilities change quickly &mdash; verify current state
              with the vendor before purchase.
            </p>

            <ul className="space-y-3 mb-12">
              {competitor.contrastBullets.map((bullet, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  <CheckCircle2
                    className="w-5 h-5 shrink-0 mt-0.5"
                    style={{ color: "var(--accent-secondary)" }}
                  />
                  <span className="text-base leading-relaxed">{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="rule-editorial mb-10" aria-hidden="true" />

            <h2
              className="font-editorial-small mb-5"
              style={{
                fontSize: "1.5rem",
                color: "var(--text-primary)",
              }}
            >
              Capability matrix
            </h2>
            <div
              className="rounded-2xl overflow-hidden mb-12"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div className="overflow-x-auto p-4 md:p-6">
                <CompetitorMatrix competitor={competitor} />
              </div>
            </div>

            <section
              className="rounded-2xl p-7 mb-12"
              style={{
                background: "var(--bg-inset)",
                border: "1px solid var(--border-default)",
              }}
            >
              <h2
                className="font-editorial-small mb-3"
                style={{
                  fontSize: "1.25rem",
                  color: "var(--text-primary)",
                }}
              >
                Already evaluating {competitor.name}?
              </h2>
              <p
                className="text-base mb-5 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Place a side-by-side test &mdash; we'll set up a free
                Revenue Operator workspace, you keep your{" "}
                {competitor.name} configuration, and you compare the two
                handling the same calls for a week. The dashboards will
                tell you which one closed more revenue.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={ROUTES.START}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium no-underline"
                  style={{
                    background: "var(--btn-primary-bg)",
                    color: "var(--btn-primary-text)",
                  }}
                >
                  Start free
                </Link>
                <Link
                  href="/safety"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium no-underline"
                  style={{
                    border: "1px solid var(--btn-secondary-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  Read what we never do
                </Link>
              </div>
            </section>

            <p
              className="text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              Other comparisons:{" "}
              {AI_COMPETITORS.filter((c) => c.slug !== slug).map((c, i, arr) => (
                <span key={c.slug}>
                  <Link
                    href={`/compare/${c.slug}`}
                    className="underline"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    {c.name}
                  </Link>
                  {i < arr.length - 1 ? " · " : ""}
                </span>
              ))}{" "}
              ·{" "}
              <Link
                href="/compare/smith-ai"
                className="underline"
                style={{ color: "var(--accent-primary)" }}
              >
                Smith.ai
              </Link>
              {" · "}
              <Link
                href="/compare/ruby"
                className="underline"
                style={{ color: "var(--accent-primary)" }}
              >
                Ruby
              </Link>
              {" · "}
              <Link
                href="/compare/gohighlevel"
                className="underline"
                style={{ color: "var(--accent-primary)" }}
              >
                GoHighLevel
              </Link>
            </p>
          </article>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
