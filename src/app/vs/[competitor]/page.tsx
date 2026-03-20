import { redirect } from "next/navigation";
import type { Metadata } from "next";

/**
 * /vs/[competitor] redirects to /compare/[competitor]
 * Captures the cleaner "/vs/" URL pattern from the directive while
 * keeping the existing comparison pages at /compare/.
 */

const COMPETITOR_MAP: Record<string, string> = {
  "synthflow": "synthflow",
  "vapi": "vapi",
  "bland-ai": "bland-ai",
  "dialora": "dialora",
  "retell-ai": "retell-ai",
  "poly-ai": "poly-ai",
  "goodcall": "goodcall",
  "lindy": "lindy",
  "smith-ai": "smith-ai",
  "ruby": "ruby",
  "gohighlevel": "gohighlevel",
  "hiring-receptionist": "hiring-receptionist",
};

interface PageProps {
  params: Promise<{ competitor: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { competitor } = await params;
  const mapped = COMPETITOR_MAP[competitor] ?? competitor;
  return {
    alternates: {
      canonical: `https://www.recall-touch.com/compare/${mapped}`,
    },
  };
}

export default async function VsCompetitorRedirect({ params }: PageProps) {
  const { competitor } = await params;
  const mapped = COMPETITOR_MAP[competitor] ?? competitor;
  redirect(`/compare/${mapped}`);
}
