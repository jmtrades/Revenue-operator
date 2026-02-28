import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Guides, API reference, and compliance framework documentation for Recall Touch.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
