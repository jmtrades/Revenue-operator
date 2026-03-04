import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { IndustryPageTemplate } from "@/components/IndustryPageTemplate";
import {
  getIndustryBySlug,
  INDUSTRY_SLUGS,
} from "@/lib/data/industries";

export function generateStaticParams() {
  return INDUSTRY_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const industry = getIndustryBySlug(params.slug);
  if (!industry) return { title: "Industry | Recall Touch" };
  return {
    title: `${industry.name} AI Phone Agent | Recall Touch`,
    description: `Never miss a ${industry.customerType} again. ${industry.name} AI phone agent for your business.`,
  };
}

export default function IndustryPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;
  const industry = getIndustryBySlug(slug);

  if (!industry) {
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
                Solutions
              </p>
              <h1
                className="font-bold text-2xl md:text-3xl mb-4"
                style={{
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                Coming soon
              </h1>
              <p
                className="text-base mb-8"
                style={{
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                We&apos;re building a dedicated page for this industry. In the
                meantime, join the waitlist for early access and founding
                pricing.
              </p>
              <Link
                href="/#waitlist"
                className="btn-marketing-primary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline"
              >
                Join waitlist →
              </Link>
              <p className="mt-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
                <Link href="/industries/plumbing-hvac" className="underline">
                  Plumbing & HVAC
                </Link>
                {" · "}
                <Link href="/industries/dental" className="underline">
                  Dental
                </Link>
                {" · "}
                <Link href="/industries/legal" className="underline">
                  Legal
                </Link>
                {" · "}
                <Link href="/industries/real-estate" className="underline">
                  Real Estate
                </Link>
                {" · "}
                <Link href="/industries/healthcare" className="underline">
                  Healthcare
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
