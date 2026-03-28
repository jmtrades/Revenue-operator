"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";

export function TrustedByBar() {
  const t = useTranslations("homepage.trustedBy");

  const industries = ["Home Services", "Healthcare", "Legal", "Insurance", "Real Estate", "Automotive"];

  return (
    <section
      className="marketing-section py-12 md:py-16"
      style={{ background: "var(--bg-primary)" }}
    >
      <Container>
        <AnimateOnScroll className="text-center">
          {/* Main trust statement */}
          <div className="mb-8 md:mb-10">
            <p
              className="text-base md:text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("heading", { default: "Trusted across industries" })}
            </p>
          </div>

          {/* Industry categories in pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {industries.map((industry) => (
              <div
                key={industry}
                className="px-3 py-2 rounded-full text-sm font-medium"
                style={{
                  background: "var(--bg-surface)",
                  color: "var(--text-tertiary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {industry}
              </div>
            ))}
          </div>

          {/* Rating display */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
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
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("rating", { default: "4.9/5 average rating" })}
            </p>
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
