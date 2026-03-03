"use client";

import { Container } from "@/components/ui/Container";

export function EnterpriseComparisonCard() {
  return (
    <section className="py-8 md:py-10" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <div
          className="max-w-3xl mx-auto rounded-2xl border p-6 md:p-8 text-center"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          <p className="text-sm md:text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Enterprise voice AI costs $150,000/year and takes 6 weeks to deploy. Recall Touch costs $97/month and takes 5 minutes.
          </p>
        </div>
      </Container>
    </section>
  );
}
