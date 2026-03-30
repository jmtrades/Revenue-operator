import type { Metadata } from "next";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Live demo | Revenue Operator",
  description: "Hear a live demo of Revenue Operator — your AI phone team.",
  alternates: { canonical: `${BASE}/demo` },
  openGraph: {
    title: "Live demo | Revenue Operator",
    description: "Hear a live demo of Revenue Operator — your AI phone team.",
    url: `${BASE}/demo`,
    siteName: "Revenue Operator",
    type: "website",
    images: [{ url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: "Revenue Operator Demo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Live demo | Revenue Operator",
    description: "Hear a live demo of Revenue Operator — your AI phone team.",
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
