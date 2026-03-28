"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";

export function TestimonialsGridSection() {
  const t = useTranslations("homepage.testimonialsGrid");

  const testimonials = [
    {
      id: 1,
      quote: t(
        "testimonials.0.quote",
        {
          default:
            "Recall Touch transformed our missed call recovery. We went from losing 40% of inbound leads to capturing 97% with AI-powered follow-ups. Revenue increased 280% in the first quarter.",
        }
      ),
      author: t("testimonials.0.author", { default: "Sarah Mitchell" }),
      role: t("testimonials.0.role", { default: "VP Sales" }),
      company: t("testimonials.0.company", { default: "TechScale Inc" }),
      initials: "SM",
      rating: 5,
    },
    {
      id: 2,
      quote: t(
        "testimonials.1.quote",
        {
          default:
            "The real-time coaching feature alone is worth 10x the price. Our reps' close rates jumped from 12% to 31% within 60 days. The AI knows exactly when to suggest battlecards.",
        }
      ),
      author: t("testimonials.1.author", { default: "Marcus Johnson" }),
      role: t("testimonials.1.role", { default: "Sales Director" }),
      company: t("testimonials.1.company", { default: "GrowthEngine" }),
      initials: "MJ",
      rating: 5,
    },
    {
      id: 3,
      quote: t(
        "testimonials.2.quote",
        {
          default:
            "We replaced 3 different tools with Recall Touch — dialer, coaching platform, and analytics suite. Saved $4,200/month while getting better results. The ROI is undeniable.",
        }
      ),
      author: t("testimonials.2.author", { default: "Jennifer Park" }),
      role: t("testimonials.2.role", { default: "CRO" }),
      company: t("testimonials.2.company", { default: "RevenuePro Solutions" }),
      initials: "JP",
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

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.1 } },
            hidden: {},
          }}
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.6,
                    ease: [0.23, 1, 0.32, 1],
                  },
                },
              }}
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
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
