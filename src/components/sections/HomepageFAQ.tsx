"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Container } from "@/components/ui/Container";

type FaqItem = { q: string; a: string };

export function HomepageFAQ() {
  const t = useTranslations("homepage.faq");
  const [open, setOpen] = useState<number | null>(0);

  const faqs: FaqItem[] = Array.from({ length: 11 }).map((_, i) => ({
    q: t(`items.${i}.question`),
    a: t(`items.${i}.answer`),
  }));

  return (
    <section
      className="marketing-section"
      style={{ background: "var(--bg-surface)" }}
    >
      <Container>
        <div className="text-center mb-10">
          <p
            className="eyebrow-editorial mb-5"
            style={{ color: "var(--accent-primary)" }}
          >
            {t("label")}
          </p>
          <h2
            className="font-semibold max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(1.6rem, 3.2vw, 2.4rem)",
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            {t("title")}
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-2">
          {faqs.map((item, idx) => {
            const expanded = open === idx;
            return (
              <motion.div
                key={item.q}
                className="rounded-xl overflow-hidden"
                style={{
                  border: "1px solid var(--border-default)",
                  background: expanded
                    ? "var(--bg-primary)"
                    : "var(--bg-surface)",
                  transition: "background-color 200ms cubic-bezier(0.23, 1, 0.32, 1)"
                }}
                layout
              >
                <button
                  type="button"
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
                  onClick={() => setOpen((v) => (v === idx ? null : idx))}
                  aria-expanded={expanded}
                >
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {item.q}
                  </span>
                  <motion.div
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <ChevronDown
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                  </motion.div>
                </button>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={expanded ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5">
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.a}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
