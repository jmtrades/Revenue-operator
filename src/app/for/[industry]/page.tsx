import { redirect } from "next/navigation";
import type { Metadata } from "next";

/**
 * /for/[industry] redirects to /industries/[industry]
 * This gives us the cleaner URL structure from the directive while
 * keeping the existing fully-built industry pages at /industries/.
 */

const INDUSTRY_MAP: Record<string, string> = {
  "real-estate": "real-estate",
  "home-services": "plumbing-hvac",
  "healthcare": "healthcare",
  "dental": "dental",
  "legal": "legal",
  "insurance": "insurance",
  "automotive": "auto-repair",
  "fitness": "fitness",
  "restaurants": "restaurants",
  "salon-spa": "med-spa",
  "property-management": "property-management",
  "recruiting": "recruiting",
  "ecommerce": "ecommerce",
  "saas": "saas",
  "agencies": "agencies",
  "nonprofits": "nonprofits",
  "education": "education",
  "financial-services": "financial-services",
  "construction": "construction",
};

interface PageProps {
  params: Promise<{ industry: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { industry } = await params;
  const mapped = INDUSTRY_MAP[industry] ?? industry;
  return {
    alternates: {
      canonical: `https://www.recall-touch.com/industries/${mapped}`,
    },
  };
}

export default async function ForIndustryRedirect({ params }: PageProps) {
  const { industry } = await params;
  const mapped = INDUSTRY_MAP[industry] ?? industry;
  redirect(`/industries/${mapped}`);
}
