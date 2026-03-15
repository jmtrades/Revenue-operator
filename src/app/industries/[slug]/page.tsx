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
  if (!industry) return { title: "Industry" };
  return {
    title: `${industry.name} AI Phone Agent`,
    description: `Never miss a ${industry.customerType} again. ${industry.name} AI phone agent for your business.`,
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
      <Navbar />
      <main>
        <IndustryPageTemplate industry={industry} />
      </main>
      <Footer />
    </div>
  );
}
