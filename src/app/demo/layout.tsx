import type { Metadata } from "next";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Live demo | Recall Touch",
  description: "Hear a live demo of Recall Touch — your AI phone team.",
  alternates: { canonical: `${BASE}/demo` },
  openGraph: {
    title: "Live demo | Recall Touch",
    description: "Hear a live demo of Recall Touch — your AI phone team.",
    url: `${BASE}/demo`,
    siteName: "Recall Touch",
    type: "website",
    images: [{ url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: "Recall Touch Demo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Live demo | Recall Touch",
    description: "Hear a live demo of Recall Touch — your AI phone team.",
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
