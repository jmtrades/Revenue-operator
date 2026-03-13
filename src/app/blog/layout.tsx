import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Resources and insights on answering every call, follow-up speed, and turning calls into revenue.",
  openGraph: {
    title: "Blog — Recall Touch",
    description:
      "Practical guides on missed calls, speed-to-lead, and AI phone agents for your business.",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
