import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const BASE = "https://www.recall-touch.com";

/** Known comparison slugs for sitemap and metadata. Brief: vs Smith.ai, Ruby, GoHighLevel, hiring a receptionist. */
export const COMPARE_SLUGS = [
  "smith-ai",
  "ruby",
  "gohighlevel",
  "hiring-receptionist",
] as const;

const SLUG_NAMES: Record<string, string> = {
  "smith-ai": "Smith.ai",
  ruby: "Ruby Receptionists",
  gohighlevel: "GoHighLevel",
  "hiring-receptionist": "Hiring a Receptionist",
};

export function generateStaticParams() {
  return COMPARE_SLUGS.map((competitor) => ({ competitor }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor } = await params;
  const name = SLUG_NAMES[competitor] ?? competitor;
  return {
    title: `Recall Touch vs ${name} | AI Revenue Execution`,
    description: `Compare Recall Touch with ${name}. AI that answers every call, executes follow-ups, and recovers revenue — built for service businesses.`,
    openGraph: {
      title: `Recall Touch vs ${name}`,
      url: `${BASE}/compare/${competitor}`,
    },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor } = await params;
  const t = await getTranslations("compare");
  const name = SLUG_NAMES[competitor] ?? competitor.replace(/-/g, " ");
  const title = t("title", { name });
  const subtitle = t("subtitle");
  const cta = t("cta");

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="py-16 md:py-24">
        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
              {title}
            </h1>
            <p className="text-zinc-400 text-lg">
              {subtitle}
            </p>
            <div className="pt-4">
              <Link
                href={ROUTES.START}
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-black font-semibold hover:bg-zinc-100 transition-colors"
              >
                {cta}
              </Link>
            </div>
            <p className="text-sm text-zinc-500 pt-8">
              <Link href="/product" className="underline hover:text-zinc-400">Product</Link>
              {" · "}
              <Link href={ROUTES.PRICING} className="underline hover:text-zinc-400">Pricing</Link>
              {" · "}
              <Link href={ROUTES.CONTACT} className="underline hover:text-zinc-400">Contact</Link>
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
