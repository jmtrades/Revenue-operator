import type { Metadata } from "next";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Results",
  description: "Verified outcomes from Recall Touch early customer deployments.",
  alternates: { canonical: `${BASE}/results` },
  openGraph: {
    title: "Results",
    description: "Verified outcomes from Recall Touch early customer deployments.",
    url: `${BASE}/results`,
    siteName: "Recall Touch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Results",
    description: "Verified outcomes from Recall Touch early customer deployments.",
  },
};

export default function ResultsPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main id="main">
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
}

