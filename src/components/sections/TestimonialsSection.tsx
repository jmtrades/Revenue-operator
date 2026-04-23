"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

const TESTIMONIALS_KEYS = [
  "items.0",
  "items.1",
  "items.2",
  "items.3",
  "items.4",
  "items.5",
  "items.6",
];

const AUTO_ADVANCE_MS = 10_000;

export function TestimonialsSection() {
  const t = useTranslations("homepage.testimonials");
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const count = TESTIMONIALS_KEYS.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % count), [count]);
  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + count) % count),
    [count]
  );

  // Respect user motion preferences — WCAG 2.3.3 / 2.2.2.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Auto-advance — paused on hover, focus-within, explicit toggle, or reduced-motion.
  useEffect(() => {
    const shouldAdvance = !paused && !hovered && !focused && !prefersReducedMotion;
    if (!shouldAdvance) return;
    const id = setInterval(next, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [next, paused, hovered, focused, prefersReducedMotion]);

  const testimonialKey = TESTIMONIALS_KEYS[current];

  return (
    <section
      className="marketing-section py-20 md:py-28"
      style={{ background: "var(--bg-primary)" }}
      aria-labelledby="testimonials-heading"
    >
      <Container>
        <AnimateOnScroll className="text-center mb-12">
          <p
            className="eyebrow-editorial mb-5"
            style={{ color: "var(--accent-primary)" }}
          >
            {t("label")}
          </p>
          <h2
            id="testimonials-heading"
            className="font-editorial max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(2rem, 4vw, 3.25rem)",
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

        <div
          className="max-w-3xl mx-auto"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
          }}
          role="region"
          aria-roledescription="carousel"
          aria-label="Customer testimonials"
        >
          <div
            aria-live={paused || prefersReducedMotion ? "polite" : "off"}
            aria-atomic="true"
            className="relative rounded-xl p-8 md:p-10 transition-shadow"
            style={{
              border: "1px solid var(--border-default)",
              background: "var(--bg-surface)",
            }}
          >
            {/* Star rating — accessible label describes "5 out of 5"; SVGs are presentational. */}
            <div
              className="flex items-center justify-center gap-0.5 mb-6"
              role="img"
              aria-label="Rated 5 out of 5 stars"
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  aria-hidden="true"
                  focusable="false"
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
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
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
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Controls row — dots + play/pause for WCAG 2.2.2 */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="flex items-center gap-1" role="tablist" aria-label="Select testimonial">
              {TESTIMONIALS_KEYS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === current}
                  aria-label={t("goToTestimonial", { number: i + 1 })}
                  onClick={() => setCurrent(i)}
                  className="p-2.5 rounded-full transition-[background-color,border-color,color,transform] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                >
                  <span
                    aria-hidden="true"
                    className="block w-2 h-2 rounded-full transition-[background-color,opacity]"
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

            {!prefersReducedMotion && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-pressed={paused}
                aria-label={paused ? "Play testimonial carousel" : "Pause testimonial carousel"}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                style={{
                  border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                  background: "var(--bg-surface)",
                }}
              >
                {paused ? (
                  <Play className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Pause className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            )}
          </div>

        </div>
      </Container>
    </section>
  );
}
