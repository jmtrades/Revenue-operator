"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";

const industries = ["Professional Services", "Healthcare", "Home Services", "Retail & E-Commerce", "Consulting", "Real Estate", "Legal", "Any Business"];

export function TrustedByBar() {
  const t = useTranslations("homepage.trustedBy");

  return (
    <section
      className="marketing-section py-10 md:py-14 relative"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Top/bottom borders */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--border-default) 20%, var(--border-default) 80%, transparent)" }}
      />

      <Container>
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Label */}
          <p
            className="text-[11px] font-semibold uppercase tracking-wider mb-6"
            style={{ color: "var(--text-disabled)", letterSpacing: "0.15em" }}
          >
            {t("heading", { default: "Trusted across industries" })}
          </p>

          {/* Industry pills — smooth infinite scroll on mobile, static on desktop */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
            {industries.map((industry, i) => (
              <motion.div
                key={industry}
                className="px-4 py-2 rounded-full text-[13px] font-medium"
                style={{
                  background: "var(--bg-surface)",
                  color: "var(--text-tertiary)",
                  border: "1px solid var(--border-default)",
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                {industry}
              </motion.div>
            ))}
          </div>

          {/* Rating */}
          <div className="flex items-center justify-center gap-2.5">
            <div className="flex items-center gap-0.5">
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
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {t("rating", { default: "4.9/5 average rating" })}
            </p>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
