import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Revenue Operator for sales, enterprise, or support.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
