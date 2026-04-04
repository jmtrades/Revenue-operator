"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";

const INDUSTRY_KEYS = [
  "healthcare",
  "legal",
  "realEstate",
  "homeServices",
  "consulting",
  "retail",
  "insurance",
  "financialServices",
  "recruiting",
  "saas",
];

export function CustomerLogosBar() {
  const t = useTranslations("homepage.customerLogos");

  return (
    <section
      className="py-5"
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-default)",
      }}
    >
      <Container>
        <div className="flex items-center justify-center gap-x-2 flex-wrap">
          <span
            className="text-xs font-medium mr-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            {t("builtFor")}
          </span>
          {INDUSTRY_KEYS.map((key, i) => (
            <React.Fragment key={key}>
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {t(`industries.${key}`)}
              </span>
              {i < INDUSTRY_KEYS.length - 1 && (
                <span
                  className="text-xs"
                  style={{ color: "var(--border-hover)" }}
                >
                  {t("separator")}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </Container>
    </section>
  );
}
