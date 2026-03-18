"use client";

import { useState } from "react";
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
  recallTouch: string | boolean;
  humanServices: string | boolean;
  basicAI: string | boolean;
  diyPlatforms: string | boolean;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

const COMPARISON_DATA: ComparisonRow[] = [
  {
    feature: "Answer Speed",
    recallTouch: "< 3 seconds",
    humanServices: "15–30 seconds",
    basicAI: "5–10 seconds",
    diyPlatforms: "Build it yourself",
    icon: Zap,
  },
  {
    feature: "24/7 Coverage",
    recallTouch: true,
    humanServices: "Business hours only",
    basicAI: true,
    diyPlatforms: true,
    icon: Clock,
  },
  {
    feature: "Appointment Booking",
    recallTouch: true,
    humanServices: true,
    basicAI: "Limited",
    diyPlatforms: "Build it yourself",
    icon: Phone,
  },
  {
    feature: "Follow-Up Sequences",
    recallTouch: "Automated SMS + email",
    humanServices: false,
    basicAI: "Basic SMS only",
    diyPlatforms: "Build it yourself",
    icon: MessageSquare,
  },
  {
    feature: "No-Show Recovery",
    recallTouch: true,
    humanServices: false,
    basicAI: false,
    diyPlatforms: false,
    icon: Phone,
  },
  {
    feature: "Revenue Dashboard",
    recallTouch: "Real-time $ recovered",
    humanServices: false,
    basicAI: false,
    diyPlatforms: false,
    icon: BarChart3,
  },
  {
    feature: "Industry Templates",
    recallTouch: "8 verticals, auto-seeded",
    humanServices: "Generic scripts",
    basicAI: "1–2 templates",
    diyPlatforms: false,
    icon: Building2,
  },
  {
    feature: "Setup Time",
    recallTouch: "< 3 minutes",
    humanServices: "1–2 weeks",
    basicAI: "30–60 minutes",
    diyPlatforms: "Weeks to months",
    icon: Clock,
  },
  {
    feature: "Outbound Campaigns",
    recallTouch: true,
    humanServices: false,
    basicAI: false,
    diyPlatforms: "Build it yourself",
    icon: Phone,
  },
  {
    feature: "Transparent Pricing",
    recallTouch: "$49–$997/mo flat",
    humanServices: "$4–10/call or /min",
    basicAI: "$0.50/caller + fees",
    diyPlatforms: "$0.05–0.15/min + infra",
    icon: DollarSign,
  },
  {
    feature: "HIPAA / SOC 2",
    recallTouch: true,
    humanServices: true,
    basicAI: "Extra cost",
    diyPlatforms: "Your responsibility",
    icon: Shield,
  },
];

const COMPETITOR_COLS = [
  { key: "recallTouch" as const, label: "Recall Touch", highlight: true },
  { key: "humanServices" as const, label: "Human Services", subtitle: "Smith.ai, Ruby" },
  { key: "basicAI" as const, label: "Basic AI", subtitle: "Goodcall, MyAIFrontDesk" },
  { key: "diyPlatforms" as const, label: "DIY Platforms", subtitle: "Bland, Vapi, Retell" },
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
  const [showAll, setShowAll] = useState(false);
  const visibleRows = showAll ? COMPARISON_DATA : COMPARISON_DATA.slice(0, 6);

  return (
    <section
      id="comparison"
      className="marketing-section py-20 md:py-28"
      style={{ background: "var(--bg-primary)" }}
    >
      <Container>
        <AnimateOnScroll className="text-center mb-12 md:mb-16">
          <SectionLabel>Why Recall Touch</SectionLabel>
          <h2
            className="font-bold max-w-3xl mx-auto"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            The Only AI Phone Agent Built to Track Revenue
          </h2>
          <p
            className="text-base mt-4 max-w-2xl mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            Others answer calls. We answer calls, book appointments, recover
            no-shows, run follow-up campaigns, and show you exactly how much
            money we put back in your pocket.
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

        {/* Show more / less */}
        {COMPARISON_DATA.length > 6 && (
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="text-sm font-medium px-5 py-2.5 rounded-lg border transition-colors hover:bg-white/5"
              style={{
                borderColor: "var(--border-default)",
                color: "var(--text-secondary)",
              }}
            >
              {showAll
                ? "Show less"
                : `Show all ${COMPARISON_DATA.length} features`}
            </button>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            Still comparing? Try a free test call and hear the difference.
          </p>
          <a
            href="/activate"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
            style={{
              background: "var(--accent-primary)",
              color: "#000",
            }}
          >
            <Phone className="w-4 h-4" />
            Try Recall Touch Free
          </a>
        </div>
      </Container>
    </section>
  );
}
