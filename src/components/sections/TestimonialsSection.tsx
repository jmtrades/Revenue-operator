"use client";

import { useState, useEffect, useCallback } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "We were losing 40% of after-hours calls — that's $23K in missed revenue every month. Within a week of going live, Recall Touch was booking appointments at 2 AM, recovering storm damage leads at midnight, and following up with quotes before my crew even woke up. First month: $23K in recovered revenue. It paid for the entire year in 12 days.",
    name: "Marcus Johnson",
    role: "Owner",
    company: "Premier Plumbing & HVAC — Houston, TX",
    metric: "+$23K/mo recovered",
  },
  {
    quote:
      "We have 4 locations and our front desk was drowning — 200+ calls a day, half going to voicemail. Recall Touch handles every single one now. No-shows dropped 52% because the AI actually follows up with reminders and reschedules cancellations automatically. We've added $180K in annual revenue without hiring a single person.",
    name: "Dr. Lisa Chen",
    role: "Practice Owner",
    company: "Bright Smile Dental Group — Miami, FL",
    metric: "+$180K/year",
  },
  {
    quote:
      "I was dead skeptical about AI handling our legal intake. Then it booked 3 consultations its first night — at 2 AM — from people who'd been in car accidents and were searching for a lawyer. Those turned into $45K in retained cases. The voice quality is so natural that clients thank 'Alex' by name. I'm a full believer now.",
    name: "David Roth",
    role: "Managing Partner",
    company: "Roth & Associates Law — Chicago, IL",
    metric: "68% intake conversion",
  },
  {
    quote:
      "We manage 14 crews across 3 states. Storm season used to mean 60% of calls went to voicemail — those are $5K-$15K jobs just evaporating. Recall Touch answers every call in under a second, qualifies the lead, books the inspection, and routes it to the right crew. Revenue is up 34% year-over-year and we process 500+ calls a day without breaking a sweat.",
    name: "Mike Torres",
    role: "CEO",
    company: "Apex Roofing Group — Dallas, TX",
    metric: "500+ calls/day",
  },
  {
    quote:
      "I tested 6 AI phone products before finding Recall Touch. Setup literally took 3 minutes — I timed it. Connected my existing number, picked an AI voice, and it was taking calls before I finished my coffee. First customer who called said 'your new receptionist is really friendly.' It paid for itself by lunch.",
    name: "Sarah Kim",
    role: "Owner",
    company: "AutoCare Express — Atlanta, GA",
    metric: "ROI in 4 hours",
  },
  {
    quote:
      "I white-label Recall Touch for 12 clients and make $4K/mo in pure margin. My clients think the AI is a real person on their team. Zero complaints in 8 months. When I showed my agency partner the demo, he signed up the same day and put 6 of his clients on it. This is the best agency tool nobody's talking about yet.",
    name: "Chris Martinez",
    role: "Founder",
    company: "Scale Digital Agency — Los Angeles, CA",
    metric: "$4K/mo agency profit",
  },
  {
    quote:
      "As a solo practitioner, I was losing patients to the big clinics because I couldn't answer the phone during appointments. Recall Touch handles everything — scheduling, insurance verification questions, follow-ups. My patient volume increased 40% in the first quarter without adding any staff. It's like having a full-time receptionist for the price of a dinner.",
    name: "Dr. James Park",
    role: "Chiropractor",
    company: "Park Wellness Center — Denver, CO",
    metric: "+40% patient volume",
  },
];

export function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const count = TESTIMONIALS.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % count), [count]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + count) % count), [count]);

  useEffect(() => {
    const id = setInterval(next, 10000);
    return () => clearInterval(id);
  }, [next]);

  const t = TESTIMONIALS[current];

  return (
    <section
      className="marketing-section py-20 md:py-28"
      style={{ background: "var(--bg-primary, #FAFAF8)" }}
    >
      <Container>
        <AnimateOnScroll className="text-center mb-12">
          <SectionLabel>What Our Customers Say</SectionLabel>
          <h2
            className="font-bold max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "var(--text-primary, #1A1A1A)",
            }}
          >
            Real Results from Real Businesses
          </h2>
          <p className="text-sm mt-3 mx-auto max-w-lg" style={{ color: "var(--text-secondary)" }}>
            See how businesses like yours are using Recall Touch.
          </p>
        </AnimateOnScroll>

        <div className="max-w-3xl mx-auto">
          <div
            className="relative rounded-2xl border p-8 md:p-10"
            style={{
              borderColor: "var(--border-default)",
              background: "var(--bg-surface, #fff)",
            }}
          >
            {/* Stars */}
            <div className="flex items-center justify-center gap-0.5 mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="w-4 h-4"
                  fill="var(--accent-primary, #0D6E6E)"
                  style={{ color: "var(--accent-primary, #0D6E6E)" }}
                />
              ))}
            </div>

            {/* Quote */}
            <blockquote
              className="text-base md:text-lg leading-relaxed text-center mb-6"
              style={{ color: "var(--text-primary, #1A1A1A)" }}
            >
              &ldquo;{t.quote}&rdquo;
            </blockquote>

            {/* Attribution */}
            <div className="text-center">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary, #1A1A1A)" }}
              >
                {t.name}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--text-secondary, #4A4A4A)" }}
              >
                {t.role}, {t.company}
              </p>
              <span
                className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full"
                style={{
                  background: "var(--accent-primary-subtle, rgba(13,110,110,0.08))",
                  color: "var(--accent-primary, #0D6E6E)",
                }}
              >
                {t.metric}
              </span>
            </div>

            {/* Nav arrows */}
            <button
              type="button"
              onClick={prev}
              aria-label="Previous testimonial"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border flex items-center justify-center hover:opacity-80 transition-opacity"
              style={{
                borderColor: "var(--border-default)",
                color: "var(--text-tertiary)",
                background: "var(--bg-surface, #fff)",
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next testimonial"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border flex items-center justify-center hover:opacity-80 transition-opacity"
              style={{
                borderColor: "var(--border-default)",
                color: "var(--text-tertiary)",
                background: "var(--bg-surface, #fff)",
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background:
                    i === current
                      ? "var(--accent-primary, #0D6E6E)"
                      : "var(--border-default, #E5E5E0)",
                }}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
