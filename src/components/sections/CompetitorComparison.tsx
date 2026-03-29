"use client";

import type { CSSProperties, ComponentType } from "react";
import { useTranslations } from "next-intl";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import {
  Check,
  X,
  Zap,
  Clock,
  DollarSign,
  BarChart3,
  Phone,
  MessageSquare,
  Shield,
  Building2,
} from "lucide-react";

interface ComparisonRow {
  feature: string;
  revenueOperator: string | boolean;
  humanServices: string | boolean;
  basicAI: string | boolean;
  diyPlatforms: string | boolean;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
}

interface ComparisonDataProvider {
  (t: ReturnType<typeof useTranslations>): ComparisonRow[];
}

const getComparisonData: ComparisonDataProvider = (t) => [
  {
    feature: t("features.0.name"),
    revenueOperator: t("features.0.revenueOperator"),
    humanServices: t("features.0.humanServices"),
    basicAI: t("features.0.basicAI"),
    diyPlatforms: t("features.0.diyPlatforms"),
    icon: Zap,
  },
  {
    feature: t("features.1.name"),
    revenueOperator: true,
    humanServices: t("features.1.humanServices"),
    basicAI: true,
    diyPlatforms: true,
    icon: Clock,
  },
  {
    feature: t("features.2.name"),
    revenueOperator: true,
    humanServices: true,
    basicAI: t("features.2.basicAI"),
    diyPlatforms: t("features.2.diyPlatforms"),
    icon: Phone,
  },
  {
    feature: t("features.3.name"),
    revenueOperator: t("features.3.revenueOperator"),
    humanServices: false,
    basicAI: t("features.3.basicAI"),
    diyPlatforms: t("features.3.diyPlatforms"),
    icon: MessageSquare,
  },
  {
    feature: t("features.4.name"),
    revenueOperator: true,
    humanServices: false,
    basicAI: false,
    diyPlatforms: false,
    icon: Phone,
  },
  {
    feature: t("features.5.name"),
    revenueOperator: t("features.5.revenueOperator"),
    humanServices: false,
    basicAI: false,
    diyPlatforms: false,
    icon: BarChart3,
  },
  {
    feature: t("features.6.name"),
    revenueOperator: t("features.6.revenueOperator"),
    humanServices: t("features.6.humanServices"),
    basicAI: t("features.6.basicAI"),
    diyPlatforms: false,
    icon: Building2,
  },
  {
    feature: t("features.7.name"),
    revenueOperator: t("features.7.revenueOperator"),
    humanServices: t("features.7.humanServices"),
    basicAI: t("features.7.basicAI"),
    diyPlatforms: t("features.7.diyPlatforms"),
    icon: Clock,
  },
  {
    feature: t("features.8.name"),
    revenueOperator: true,
    humanServices: false,
    basicAI: false,
    diyPlatforms: t("features.8.diyPlatforms"),
    icon: Phone,
  },
  {
    feature: t("features.9.name"),
    revenueOperator: t("features.9.revenueOperator"),
    humanServices: t("features.9.humanServices"),
    basicAI: t("features.9.basicAI"),
    diyPlatforms: t("features.9.diyPlatforms"),
    icon: DollarSign,
  },
  {
    feature: t("features.10.name"),
    revenueOperator: true,
    humanServices: true,
    basicAI: t("features.10.basicAI"),
    diyPlatforms: t("features.10.diyPlatforms"),
    icon: Shield,
  },
];

interface CompetitorColProvider {
  (t: ReturnType<typeof useTranslations>): Array<{
    key: "revenueOperator" | "humanServices" | "basicAI" | "diyPlatforms";
    label: string;
    subtitle?: string;
    highlight?: boolean;
  }>;
}

const getCompetitorCols: CompetitorColProvider = (t) => [
  { key: "revenueOperator" as const, label: t("competitors.0.name"), highlight: true },
  { key: "humanServices" as const, label: t("competitors.1.name"), subtitle: t("competitors.1.subtitle") },
  { key: "basicAI" as const, label: t("competitors.2.name"), subtitle: t("competitors.2.subtitle") },
  { key: "diyPlatforms" as const, label: t("competitors.3.name"), subtitle: t("competitors.3.subtitle") },
];

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15">
        <Check className="w-4 h-4 text-emerald-400" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10">
        <X className="w-4 h-4 text-red-400/60" />
      </span>
    );
  }
  return (
    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
      {value}
    </span>
  );
}

export function CompetitorComparison() {
  const t = useTranslations("homepage.comparison");
  const COMPARISON_DATA = getComparisonData(t);
  const COMPETITOR_COLS = getCompetitorCols(t);
  const visibleRows = COMPARISON_DATA.slice(0, 5);

  return (
    <section
      id="comparison"
      className="marketing-section py-20 md:py-28"
      style={{ background: "var(--bg-primary)" }}
    >
      <Container>
        <AnimateOnScroll className="text-center mb-12 md:mb-16">
          <SectionLabel>{t("sectionLabel")}</SectionLabel>
          <h2
            className="font-bold max-w-3xl mx-auto"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            {t("heading")}
          </h2>
          <p
            className="text-base mt-4 max-w-2xl mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("description")}
          </p>
        </AnimateOnScroll>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              borderColor: "var(--border-default)",
              background: "var(--bg-surface)",
            }}
          >
            {/* Header */}
            <div
              className="grid gap-0"
              style={{
                gridTemplateColumns: "220px repeat(4, 1fr)",
                borderBottom: "1px solid var(--border-default)",
              }}
            >
              <div className="p-4" />
              {COMPETITOR_COLS.map((col) => (
                <div
                  key={col.key}
                  className="p-4 text-center"
                  style={{
                    background: col.highlight
                      ? "rgba(34,197,94,0.06)"
                      : "transparent",
                    borderLeft: "1px solid var(--border-default)",
                  }}
                >
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color: col.highlight
                        ? "var(--accent-primary)"
                        : "var(--text-primary)",
                    }}
                  >
                    {col.label}
                  </p>
                  {"subtitle" in col && col.subtitle && (
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {col.subtitle}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Rows */}
            {visibleRows.map((row, idx) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.feature}
                  className="grid gap-0 items-center"
                  style={{
                    gridTemplateColumns: "220px repeat(4, 1fr)",
                    borderBottom:
                      idx < visibleRows.length - 1
                        ? "1px solid var(--border-default)"
                        : "none",
                  }}
                >
                  <div className="p-4 flex items-center gap-2.5">
                    <Icon
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {row.feature}
                    </span>
                  </div>
                  {COMPETITOR_COLS.map((col) => (
                    <div
                      key={col.key}
                      className="p-4 flex items-center justify-center"
                      style={{
                        background: col.highlight
                          ? "rgba(34,197,94,0.03)"
                          : "transparent",
                        borderLeft: "1px solid var(--border-default)",
                      }}
                    >
                      <CellValue value={row[col.key]} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden space-y-3">
          {visibleRows.map((row) => {
            const Icon = row.icon;
            return (
              <div
                key={row.feature}
                className="rounded-xl border p-4"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-surface)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon
                    className="w-4 h-4"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {row.feature}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {COMPETITOR_COLS.map((col) => (
                    <div
                      key={col.key}
                      className="rounded-lg p-2.5"
                      style={{
                        background: col.highlight
                          ? "rgba(34,197,94,0.08)"
                          : "rgba(255,255,255,0.02)",
                        border: col.highlight
                          ? "1px solid rgba(34,197,94,0.2)"
                          : "1px solid var(--border-default)",
                      }}
                    >
                      <p
                        className="text-[10px] font-medium uppercase tracking-wide mb-1"
                        style={{
                          color: col.highlight
                            ? "var(--accent-primary)"
                            : "var(--text-tertiary)",
                        }}
                      >
                        {col.label}
                      </p>
                      <CellValue value={row[col.key]} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("ctaDescription")}
          </p>
          <a
            href="/activate"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-colors hover:opacity-90"
            style={{
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
            }}
          >
            <Phone className="w-4 h-4" />
            {t("ctaButton")}
          </a>
        </div>
      </Container>
    </section>
  );
}
