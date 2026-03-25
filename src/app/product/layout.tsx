import type { Metadata } from "next";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Product — Recall Touch",
  description: "Call governance, automated follow-ups, compliance records, and escalation control — built for regulated commercial operations.",
  alternates: { canonical: `${BASE}/product` },
  openGraph: {
    title: "Product — Recall Touch",
    description: "One platform for every phone interaction — inbound calls, outbound campaigns, SMS, scheduling, lead capture, and analytics.",
    url: `${BASE}/product`,
    siteName: "Recall Touch",
    type: "website",
    images: [{ url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: "Recall Touch Product" }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Product — Recall Touch",
    description: "One platform for every phone interaction — inbound calls, outbound campaigns, SMS, scheduling, lead capture, and analytics.",
    creator: "@recalltouch",
  },
};

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
