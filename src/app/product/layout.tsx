import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product",
  description: "Call governance, automated follow-ups, compliance records, and escalation control — built for regulated commercial operations.",
};

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
