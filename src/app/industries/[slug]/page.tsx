import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { IndustryPageTemplate } from "@/components/IndustryPageTemplate";
import {
  getIndustryBySlug,
  INDUSTRY_SLUGS,
} from "@/lib/data/industries";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.recall-touch.com";

export function generateStaticParams() {
  return INDUSTRY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const industry = getIndustryBySlug(slug);
  if (!industry) {
    const t = await getTranslations("industriesPage.fallback");
    return { title: t("title") };
  }
  const title = `${industry.name} AI Revenue Operations Platform — Recall Touch`;
  const description = `Drive ${industry.customerType} revenue with complete AI-powered workflows: call answering, appointment scheduling, no-show prevention, follow-up automation, and campaign execution for ${industry.name}.`;
  const url = `${BASE}/industries/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Recall Touch",
      type: "website",
      images: [{ url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: `${industry.name} AI Phone Agent` }],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      creator: "@recalltouch",
    },
  };
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  let slug: string | null = null;
  let industry: Awaited<ReturnType<typeof getIndustryBySlug>> = null;
  try {
    const p = await params;
    slug = p.slug;
    industry = getIndustryBySlug(slug);
  } catch {
    // Params or data failure: show fallback below
  }

  if (!industry || !slug) {
    const t = await getTranslations("industriesPage.fallback");
    return (
      <div
        className="min-h-screen"
        style={{
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
        }}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Recall Touch", item: BASE },
                { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
              ],
            }),
          }}
        />
        <Navbar />
        <main className="pt-28 pb-24">
          <Container>
            <div className="max-w-xl mx-auto text-center">
              <p
                className="section-label mb-4"
                style={{ color: "var(--accent-primary)" }}
              >
                {t("solutions")}
              </p>
              <h1
                className="font-bold text-2xl md:text-3xl mb-4"
                style={{
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                {t("dedicatedGuide")}
              </h1>
              <p
                className="text-base mb-8"
                style={{
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                {t("description")}
              </p>
              <Link
                href={ROUTES.START}
                className="btn-marketing-primary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline"
              >
                {t("startFreeCta")}
              </Link>
              <p className="mt-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
                <Link href="/industries/plumbing-hvac" className="underline">
                  {t("linkPlumbing")}
                </Link>
                {" · "}
                <Link href="/industries/dental" className="underline">
                  {t("linkDental")}
                </Link>
                {" · "}
                <Link href="/industries/legal" className="underline">
                  {t("linkLegal")}
                </Link>
                {" · "}
                <Link href="/industries/real-estate" className="underline">
                  {t("linkRealEstate")}
                </Link>
                {" · "}
                <Link href="/industries/healthcare" className="underline">
                  {t("linkHealthcare")}
                </Link>
              </p>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Recall Touch", item: BASE },
              { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE}/industries` },
              {
                "@type": "ListItem",
                position: 3,
                name: industry.name,
                item: `${BASE}/industries/${slug}`,
              },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: `${industry.name} AI Phone Agent`,
            url: `${BASE}/industries/${slug}`,
            description: `Complete AI revenue operations for ${industry.customerType}: call answering, appointment scheduling, no-show prevention, automated follow-up, campaign execution, and revenue recovery.`,
            address: {
              "@type": "PostalAddress",
              addressCountry: "US",
            },
          }),
        }}
      />
      <Navbar />
      <main>
        <IndustryPageTemplate industry={industry} />
      </main>
      <Footer />
    </div>
  );
}
