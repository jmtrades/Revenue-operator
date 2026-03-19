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
      "Human + AI virtual receptionists. Limited capacity, expensive ($300-$1,125/mo), no follow-up engine or revenue tracking.",
    keywords: [
      "Smith.ai alternative",
      "AI receptionist",
      "vs Smith.ai",
      "cheaper than Smith.ai",
    ],
  },
  ruby: {
    name: "Ruby Receptionists",
    description:
      "Premium live virtual receptionist service. Pure human cost model, no AI automation, no follow-up or booking capabilities.",
    keywords: [
      "Ruby Receptionists alternative",
      "virtual receptionist",
      "vs Ruby",
      "cheaper than Ruby",
    ],
  },
  gohighlevel: {
    name: "GoHighLevel",
    description:
      "All-in-one marketing platform. Voice AI is basic and an afterthought, not purpose-built for revenue execution.",
    keywords: [
      "GoHighLevel alternative",
      "better than GoHighLevel",
      "vs GoHighLevel",
      "AI phone answering",
    ],
  },
  "hiring-receptionist": {
    name: "Hiring a Receptionist",
    description:
      "Traditional employment ($3,200-$4,500/mo salary + benefits). Single call capacity, sick days, turnover, no analytics.",
    keywords: [
      "virtual receptionist vs hiring",
      "receptionist AI alternative",
      "save on receptionist costs",
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
  const description = `${data.description} See how Recall Touch compares: 10x better capacity, 60-80% cheaper, automated follow-ups, and revenue attribution built in.`;

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
                See the proof (and the plan)
              </h2>
              <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Want to validate outcomes and compare cost? Review real results and then match the right tier for your call volume.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/results"
                  className="btn-marketing-secondary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline"
                >
                  View results →
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
