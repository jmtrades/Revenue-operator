import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live demo | Recall Touch",
  description: "Hear a live demo of Recall Touch — your AI phone team.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
