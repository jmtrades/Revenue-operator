import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MarketingNavbar } from "@/components/sections/MarketingNavbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.recall-touch.com";

const SECTION_IDS = [
  "answers-every-call",
  "outbound",
  "agents",
  "leads",
  "appointments",
  "messaging",
  "insights",
  "compliance",
] as const;

const SECTION_KEY_MAP: Record<(typeof SECTION_IDS)[number], { title: string; desc: string }> = {
  "answers-every-call": { title: "answersEveryCallTitle", desc: "answersEveryCallDesc" },
  outbound: { title: "outboundTitle", desc: "outboundDesc" },
  agents: { title: "agentsTitle", desc: "agentsDesc" },
  leads: { title: "leadsTitle", desc: "leadsDesc" },
  appointments: { title: "appointmentsTitle", desc: "appointmentsDesc" },
  messaging: { title: "messagingTitle", desc: "messagingDesc" },
  insights: { title: "insightsTitle", desc: "insightsDesc" },
  compliance: { title: "complianceTitle", desc: "complianceDesc" },
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("productPage");
  return {
    title: `${t("metaTitle")} — Revenue Operator`,
    description: t("metaDescription"),
  };
}

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Revenue Operator",
  description: "AI phone system. Answers every call 24/7, books appointments, qualifies leads, outbound campaigns, SMS, analytics.",
  url: BASE,
  brand: { "@type": "Brand", name: "Revenue Operator" },
};

export default async function ProductPage() {
  const t = await getTranslations("productPage");
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revenue Operator", item: BASE },
      { "@type": "ListItem", position: 2, name: "Product", item: `${BASE}/product` },
    ],
  };

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Go live with Revenue Operator",
    description: "Set up your AI phone agent in minutes. Answer calls, book appointments, and recover missed revenue with automated follow-up.",
    totalTime: "PT5M",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Choose your industry & configure defaults",
        text: "Select an industry and configure your greeting, hours, and routing rules.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Connect your number",
        text: "Forward your existing business number or buy a new one and make sure calls reach your agent.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Run a test call",
        text: "Trigger a real test call. Verify the greeting and the outcomes the agent captures.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Approve or adjust",
        text: "Approve what the agent should say, and refine follow-up and booking behavior as needed.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Go live",
        text: "Enable live answering. Your AI runs 24/7 and books appointments with reminders and no-show recovery.",
      },
    ],
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <MarketingNavbar />
      <main className="pt-28 pb-24">
        <Container>
          <section className="max-w-3xl mb-16">
            <p className="section-label mb-4">{t("sectionLabel")}</p>
            <h1
              className="font-bold text-3xl md:text-4xl mb-6"
              style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
            >
              {t("heading")}
            </h1>
            <p
              className="text-lg"
              style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
            >
              {t("subheading")}
            </p>
          </section>

          <section className="mb-20">
            <h2
              className="font-semibold text-xl mb-8"
              style={{ color: "var(--text-primary)" }}
            >
              {t("coreCapabilities")}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SECTION_IDS.map((id) => (
                <div key={id} id={id} className="card-marketing p-5 flex flex-col">
                  <h3
                    className="font-semibold text-base mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t(SECTION_KEY_MAP[id].title)}
                  </h3>
                  <p
                    className="text-sm flex-1"
                    style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}
                  >
                    {t(SECTION_KEY_MAP[id].desc)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-16 pt-12 border-t" style={{ borderColor: "var(--border-default)" }}>
            <h2
              className="font-semibold text-xl mb-8 text-center"
              style={{ color: "var(--text-primary)" }}
            >
              {t("useCases")}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card-marketing p-6 flex flex-col">
                <h3
                  className="font-semibold text-lg mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("forBusinesses")}
                </h3>
                <p
                  className="text-sm flex-1"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
                >
                  {t("forBusinessesDesc")}
                </p>
                <Link
                  href={ROUTES.START}
                  className="text-sm font-medium mt-4 inline-block"
                  style={{ color: "var(--accent-primary)" }}
                >
                  {t("getStarted")}
                </Link>
              </div>
              <div className="card-marketing p-6 flex flex-col">
                <h3
                  className="font-semibold text-lg mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("forTeams")}
                </h3>
                <p
                  className="text-sm flex-1"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
                >
                  {t("forTeamsDesc")}
                </p>
                <Link
                  href={ROUTES.START}
                  className="text-sm font-medium mt-4 inline-block"
                  style={{ color: "var(--accent-primary)" }}
                >
                  {t("getStarted")}
                </Link>
              </div>
              <div className="card-marketing p-6 flex flex-col">
                <h3
                  className="font-semibold text-lg mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("forDevelopers")}
                </h3>
                <p
                  className="text-sm flex-1"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
                >
                  {t("forDevelopersDesc")}
                </p>
                <Link
                  href={ROUTES.DOCS}
                  className="text-sm font-medium mt-4 inline-block"
                  style={{ color: "var(--accent-primary)" }}
                >
                  {t("documentation")}
                </Link>
              </div>
            </div>
          </section>

          <section
            className="mt-20 mb-20 py-12 px-6 rounded-2xl border"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            <h2
              className="font-semibold text-xl mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              {t("complianceHeading")}
            </h2>
            <p
              className="text-base mb-4"
              style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
            >
              {t("complianceBody")}
            </p>
            <ul className="space-y-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              <li>{t("complianceBullets")}</li>
            </ul>
          </section>

          <section
            className="mt-24 py-16 text-center"
            style={{
              background: "var(--gradient-cta-section)",
              borderTop: "1px solid var(--border-default)",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <p
              className="text-sm font-medium mb-4"
              style={{ color: "var(--accent-primary)" }}
            >
              {t("ctaSubtext")}
            </p>
            <h2
              className="font-semibold text-2xl mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              {t("ctaHeading")}
            </h2>
            <p
              className="text-base mb-8 max-w-xl mx-auto"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("ctaBody")}
            </p>
            <Link
              href={ROUTES.START}
              className="btn-marketing-primary btn-lg no-underline inline-block"
            >
              {t("ctaButton")}
            </Link>
            <p
              className="text-sm mt-6"
              style={{ color: "var(--text-tertiary)" }}
            >
              {t("or")}{" "}
              <Link
                href={ROUTES.CONTACT}
                className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded"
                style={{ color: "var(--text-tertiary)" }}
              >
                {t("orBookDemo")}
              </Link>
              {" · "}
              <Link
                href={ROUTES.DOCS}
                className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded"
                style={{ color: "var(--text-tertiary)" }}
              >
                {t("viewDocs")}
              </Link>
            </p>
          </section>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

