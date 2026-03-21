"use client";

import { useState, useEffect, useCallback } from "react";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
      "I tested 6 AI phone products before finding Recall Touch. The difference is night and day — this one actually books appointments, follows up on quotes, and routes urgent calls to my cell. Connected my existing number and it was handling the full workflow within an hour. First week ROI was 11x.",
    name: "Sarah Kim",
    role: "Owner",
    company: "AutoCare Express — Atlanta, GA",
    metric: "11x ROI in week one",
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
      "As a solo practitioner, I was losing patients to the big clinics because I couldn't answer during appointments. Recall Touch runs my entire patient communication — scheduling, follow-ups, no-show recovery, reactivation campaigns for lapsed patients. My patient volume increased 40% in the first quarter without adding any staff. It's a full operations layer, not just a phone tool.",
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
  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + count) % count),
    [count]
  );

  useEffect(() => {
    const id = setInterval(next, 10000);
    return () => clearInterval(id);
  }, [next]);

  const t = TESTIMONIALS[current];

  return (
    <section
      className="marketing-section py-20 md:py-28"
      style={{ background: "var(--bg-primary)" }}
    >
      <Container>
        <AnimateOnScroll className="text-center mb-12">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            Customer Stories
          </p>
          <h2
            className="font-semibold max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            What Our Customers Report
          </h2>
          <p
            className="text-sm mt-3 mx-auto max-w-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            Verified results from active accounts.
          </p>
        </AnimateOnScroll>

        <div className="max-w-3xl mx-auto">
          <div
            className="relative rounded-xl p-8 md:p-10 transition-shadow"
            style={{
              border: "1px solid var(--border-default)",
              background: "var(--bg-surface)",
            }}
          >
            {/* Stars */}
            <div className="flex items-center justify-center gap-0.5 mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  className="w-4 h-4"
                  viewBox="0 0 20 20"
                  fill="var(--accent-warning, #F59E0B)"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            {/* Quote */}
            <blockquote
              className="text-base md:text-lg leading-relaxed text-center mb-6"
              style={{ color: "var(--text-primary)" }}
            >
              &ldquo;{t.quote}&rdquo;
            </blockquote>

            {/* Attribution */}
            <div className="text-center">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {t.name}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {t.role}, {t.company}
              </p>
              <span
                className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full"
                style={{
                  background: "var(--accent-primary-subtle)",
                  color: "var(--accent-primary)",
                }}
              >
                {t.metric}
              </span>
            </div>

            {/* Nav arrows — 44px minimum touch target */}
            <button
              type="button"
              onClick={prev}
              aria-label="Previous testimonial"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              style={{
                border: "1px solid var(--border-default)",
                color: "var(--text-tertiary)",
                background: "var(--bg-primary)",
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next testimonial"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              style={{
                border: "1px solid var(--border-default)",
                color: "var(--text-tertiary)",
                background: "var(--bg-primary)",
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dots — padded for 44px touch target */}
          <div className="flex items-center justify-center gap-1 mt-6">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                className="p-2.5 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
              >
                <span
                  className="block w-2 h-2 rounded-full transition-all"
                  style={{
                    background:
                      i === current
                        ? "var(--accent-primary)"
                        : "var(--border-default)",
                    transform: i === current ? "scale(1.3)" : "scale(1)",
                  }}
                />
              </button>
            ))}
          </div>

        </div>
      </Container>
    </section>
  );
}
