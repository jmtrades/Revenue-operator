"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";

export function TestimonialsGridSection() {
  const t = useTranslations("homepage.testimonialsGrid");

  const testimonials = [
    {
      id: 1,
      quote: t(
        "testimonials.0.quote",
        {
          default:
            "We went from missing half our after-hours calls to capturing every single one. The AI books appointments while we sleep — it paid for itself in the first week.",
        }
      ),
      author: t("testimonials.0.author", { default: "Home Services Company" }),
      role: t("testimonials.0.role", { default: "Home Services — Texas" }),
      company: t("testimonials.0.company", { default: "" }),
      initials: "HS",
      rating: 5,
    },
    {
      id: 2,
      quote: t(
        "testimonials.1.quote",
        {
          default:
            "Our front desk was overwhelmed. Now every patient inquiry gets answered instantly — scheduling, insurance questions, follow-ups. Our no-show rate dropped dramatically.",
        }
      ),
      author: t("testimonials.1.author", { default: "Multi-Location Practice" }),
      role: t("testimonials.1.role", { default: "Healthcare — California" }),
      company: t("testimonials.1.company", { default: "" }),
      initials: "MP",
      rating: 5,
    },
    {
      id: 3,
      quote: t(
        "testimonials.2.quote",
        {
          default:
            "We consolidated our dialer, follow-up tool, and analytics into one platform. The revenue attribution alone saved us hours every week.",
        }
      ),
      author: t("testimonials.2.author", { default: "Sales Operations Team" }),
      role: t("testimonials.2.role", { default: "SaaS — Remote" }),
      company: t("testimonials.2.company", { default: "" }),
      initials: "SO",
      rating: 5,
    },
  ];

  return (
    <section
      className="marketing-section py-16 md:py-24"
      style={{ background: "var(--bg-primary)" }}
    >
      <Container>
        <AnimateOnScroll className="text-center mb-12 md:mb-16">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--accent-primary)" }}
          >
            {t("label", { default: "Success Stories" })}
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
            {t("title", { default: "What customers are saying" })}
          </h2>
        </AnimateOnScroll>

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="rounded-xl p-6 md:p-8 flex flex-col"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
              }}
            >
              {/* Star rating */}
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <svg
                    key={i}
                    className="w-4 h-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    style={{ color: "var(--accent-warning, #F59E0B)" }}
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <blockquote
                className="text-sm md:text-base leading-relaxed mb-6 flex-grow"
                style={{ color: "var(--text-primary)" }}
              >
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              {/* Author with avatar */}
              <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
                  style={{
                    background: "var(--accent-primary)",
                    color: "white",
                  }}
                >
                  {testimonial.initials}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {testimonial.author}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
