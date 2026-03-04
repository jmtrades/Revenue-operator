"use client";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";

const TESTIMONIALS = [
  {
    quote:
      "We replaced three tools — phone answering, text follow-up, and scheduling — with one platform.",
    author: "Amanda K.",
    role: "Consulting firm",
    stars: 5,
  },
  {
    quote:
      "Our sales team follows up 10x faster now. The AI handles the initial outreach and books qualified meetings.",
    author: "Ryan D.",
    role: "SaaS startup",
    stars: 5,
  },
  {
    quote:
      "Recall Touch paid for itself in the first week. We captured 14 leads we would have missed.",
    author: "Mike R.",
    role: "Plumbing company owner",
    stars: 5,
  },
  {
    quote:
      "Our no-show rate dropped 40% since the AI started sending reminders.",
    author: "Dr. Sarah L.",
    role: "Dental practice",
    stars: 5,
  },
  {
    quote:
      "I was skeptical about AI answering my phones. After one day I was convinced.",
    author: "James T.",
    role: "Roofing contractor",
    stars: 5,
  },
];

const INDUSTRY_BADGES = ["Used across 50+ industries — from solo operators to enterprise teams"];

export function TestimonialsSection() {
  return (
    <section className="marketing-section py-12 md:py-16" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-10">
          <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Trusted by 200+ businesses across 12 industries
          </p>
          <SectionLabel>What customers say</SectionLabel>
        </AnimateOnScroll>
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
          {TESTIMONIALS.map((t, i) => (
            <AnimateOnScroll key={i}>
              <div
                className="p-6 rounded-2xl border h-full flex flex-col"
                style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
              >
                <div className="flex gap-0.5 mb-3" aria-hidden>
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <span key={j} className="text-amber-400" style={{ fontSize: "1rem" }}>
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm flex-1 mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                  — {t.author}, {t.role}
                </p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {INDUSTRY_BADGES.map((label) => (
            <span
              key={label}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-tertiary)" }}
            >
              {label}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
