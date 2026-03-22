"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TESTIMONIALS_KEYS = [
  "items.0",
  "items.1",
  "items.2",
  "items.3",
  "items.4",
  "items.5",
  "items.6",
];

export function TestimonialsSection() {
  const t = useTranslations("homepage.testimonials");
  const [current, setCurrent] = useState(0);
  const count = TESTIMONIALS_KEYS.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % count), [count]);
  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + count) % count),
    [count]
  );

  useEffect(() => {
    const id = setInterval(next, 10000);
    return () => clearInterval(id);
  }, [next]);

  const testimonialKey = TESTIMONIALS_KEYS[current];

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
            {t("label")}
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
            {t("title")}
          </h2>
          <p
            className="text-sm mt-3 mx-auto max-w-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("description")}
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
              &ldquo;{t(`${testimonialKey}.quote`)}&rdquo;
            </blockquote>

            {/* Attribution */}
            <div className="text-center">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {t(`${testimonialKey}.name`)}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {t(`${testimonialKey}.role`)}, {t(`${testimonialKey}.company`)}
              </p>
              <span
                className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full"
                style={{
                  background: "var(--accent-primary-subtle)",
                  color: "var(--accent-primary)",
                }}
              >
                {t(`${testimonialKey}.metric`)}
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
            {TESTIMONIALS_KEYS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={t("goToTestimonial", { number: i + 1 })}
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
