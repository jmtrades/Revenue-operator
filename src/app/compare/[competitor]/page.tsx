import type { Metadata } from "next";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ComparisonContent } from "@/components/ComparisonContent";

const BASE = "https://www.recall-touch.com";

/** Known comparison slugs for sitemap and metadata. Brief: vs Smith.ai, Ruby, GoHighLevel, hiring a receptionist. */
export const COMPARE_SLUGS = [
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

  const title = `Recall Touch vs ${data.name} | AI Revenue Execution`;
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

  return (
    <div className="min-h-screen bg-black text-white">
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
        </Container>
      </main>
      <Footer />
    </div>
  );
}
