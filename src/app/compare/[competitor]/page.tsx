import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ComparisonContent } from "@/components/ComparisonContent";

const BASE = "https://www.recall-touch.com";

/** Known comparison slugs for sitemap and metadata. Brief: vs Smith.ai, Ruby, GoHighLevel, hiring a receptionist. */
const COMPARE_SLUGS = [
  "smith-ai",
  "ruby",
  "gohighlevel",
  "hiring-receptionist",
] as const;

const COMPETITOR_DATA: Record<
  string,
  { name: string; description: string; keywords: string[] }
> = {
  "smith-ai": {
    name: "Smith.ai",
    description:
      "Human + AI virtual receptionists offering call answering and scheduling. Starting at $300/mo. Focus on call handling without integrated follow-up automation or outcome tracking.",
    keywords: [
      "Smith.ai alternative",
      "AI receptionist",
      "vs Smith.ai",
      "AI phone answering",
    ],
  },
  ruby: {
    name: "Ruby Receptionists",
    description:
      "Live virtual receptionist service providing phone coverage and appointment scheduling. Human-staffed model with traditional pricing. Call handling is the primary offering without integrated follow-up workflows.",
    keywords: [
      "Ruby Receptionists alternative",
      "virtual receptionist",
      "vs Ruby",
      "AI receptionist service",
    ],
  },
  gohighlevel: {
    name: "GoHighLevel",
    description:
      "All-in-one platform for agencies and businesses. Includes voice AI and calling features alongside marketing automation, CRM, and funnel building. Voice is one module among many.",
    keywords: [
      "GoHighLevel alternative",
      "GoHighLevel phone system",
      "vs GoHighLevel",
      "AI phone answering",
    ],
  },
  "hiring-receptionist": {
    name: "Hiring a Receptionist",
    description:
      "Direct employment of a receptionist providing live call answering and scheduling. Typical cost $3,200-$4,500/mo with salary and benefits. Single availability window and traditional staffing constraints.",
    keywords: [
      "virtual receptionist vs hiring",
      "receptionist AI alternative",
      "phone answering service",
      "AI phone system",
    ],
  },
};

export function generateStaticParams() {
  return COMPARE_SLUGS.map((competitor) => ({ competitor }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor } = await params;
  const data = COMPETITOR_DATA[competitor];

  if (!data) {
    return {
      title: "Comparison | Recall Touch",
      description: "Compare Recall Touch with other solutions.",
    };
  }

  const title = `Recall Touch vs ${data.name} — Recall Touch`;
  const description = `${data.description} Compare with Recall Touch: 24/7 AI phone system with automated follow-up workflows, appointment booking, and outcome tracking.`;

  return {
    title,
    description,
    keywords: data.keywords,
    alternates: {
      canonical: `${BASE}/compare/${competitor}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE}/compare/${competitor}`,
      siteName: "Recall Touch",
      type: "website",
      images: [
        {
          url: `${BASE}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `Recall Touch vs ${data.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

const jsonLdSchema = (competitor: string) => {
  const data = COMPETITOR_DATA[competitor];
  if (!data) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ComparisonChart",
    name: `Recall Touch vs ${data.name}`,
    description: data.description,
    url: `${BASE}/compare/${competitor}`,
    creator: {
      "@type": "Organization",
      name: "Recall Touch",
      url: `${BASE}`,
    },
  };
};

export default async function ComparePage({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor } = await params;
  const schema = jsonLdSchema(competitor);
  const data = COMPETITOR_DATA[competitor];

  return (
    <div className="min-h-screen bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Recall Touch", item: BASE },
              { "@type": "ListItem", position: 2, name: "Comparisons", item: `${BASE}/compare` },
              {
                "@type": "ListItem",
                position: 3,
                name: data?.name ?? competitor,
                item: `${BASE}/compare/${competitor}`,
              },
            ],
          }),
        }}
      />
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
      <Navbar />
      <main className="py-16 md:py-24">
        <Container>
          <ComparisonContent competitor={competitor} />
          <section className="mt-12">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-8">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                Ready to try Recall Touch?
              </h2>
              <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Watch a live demo to see how Recall Touch handles inbound calls, qualifies intent, and executes follow-up workflows. Then start your free trial.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/demo"
                  className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline"
                >
                  Watch demo →
                </Link>
                <Link
                  href="/pricing"
                  className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline"
                >
                  View pricing →
                </Link>
              </div>
            </div>
          </section>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
