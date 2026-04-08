import type { Metadata } from "next";
import { hreflangAlternateLanguages } from "@/lib/seo/hreflang";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Resources and insights on answering every call, follow-up speed, and turning calls into revenue.",
  alternates: {
    canonical: "https://www.recall-touch.com/blog",
    languages: hreflangAlternateLanguages("/blog"),
  },
  openGraph: {
    title: "Blog — Revenue Operator",
    description:
      "Practical guides on AI phone agents, speed-to-lead, and AI phone agents for your business.",
    url: "https://www.recall-touch.com/blog",
    siteName: "Revenue Operator",
    type: "website",
    images: [{ url: "https://www.recall-touch.com/opengraph-image", width: 1200, height: 630, alt: "Revenue Operator Blog" }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — Revenue Operator",
    description: "Practical guides on AI phone agents, speed-to-lead, and AI phone agents for your business.",
    creator: "@revenueoperator",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
