"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
            className="text-[11px] font-semibold uppercase tracking-wider mb-4"
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
              <div
                key={item.q}
                className="rounded-xl overflow-hidden transition-colors"
                style={{
                  border: "1px solid var(--border-default)",
                  background: expanded
                    ? "var(--bg-primary)"
                    : "var(--bg-surface)",
                }}
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
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                    style={{ color: "var(--text-tertiary)" }}
                  />
                </button>
                <div
                  className="accordion-content"
                  data-open={expanded ? "true" : "false"}
                >
                  <div>
                    <div className="px-5 pb-5">
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
