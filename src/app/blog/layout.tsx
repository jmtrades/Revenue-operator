import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — Recall Touch",
  description:
    "Resources and insights on answering every call, follow-up speed, and turning calls into revenue.",
  alternates: { canonical: "https://www.recall-touch.com/blog" },
  openGraph: {
    title: "Blog — Recall Touch",
    description:
      "Practical guides on missed calls, speed-to-lead, and AI phone agents for your business.",
    url: "https://www.recall-touch.com/blog",
    siteName: "Recall Touch",
    type: "website",
    images: [{ url: "https://www.recall-touch.com/opengraph-image", width: 1200, height: 630, alt: "Recall Touch Blog" }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — Recall Touch",
    description: "Practical guides on missed calls, speed-to-lead, and AI phone agents for your business.",
    creator: "@recalltouch",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
