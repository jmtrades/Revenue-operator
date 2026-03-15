"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Wrench,
  Smile,
  Scale,
  Home,
  Heart,
  Phone,
  DollarSign,
  TrendingDown,
  PhoneMissed,
  Clock,
  Zap,
  Calendar,
  MapPin,
  Calculator,
  Shield,
  AlertCircle,
  ClipboardList,
  PhoneOff,
  Package,
  CreditCard,
  Target,
  Users,
  Link2,
  Brain,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { IndustryData } from "@/lib/data/industries";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ROUTES } from "@/lib/constants";

const HERO_ICONS: Record<string, LucideIcon> = {
  Wrench,
  Smile,
  Scale,
  Home,
  Heart,
};

const STAT_ICONS: Record<string, LucideIcon> = {
  Phone,
  DollarSign,
  TrendingDown,
  PhoneMissed,
  Clock,
  PhoneOff,
};

const CAPABILITY_ICONS: Record<string, LucideIcon> = {
  Zap,
  Calendar,
  MapPin,
  Calculator,
  Shield,
  AlertCircle,
  ClipboardList,
  Package,
  CreditCard,
  Target,
  Users,
  Home,
};

const HOW_IT_WORKS_ICONS: Record<string, LucideIcon> = {
  Link2,
  Brain,
  Sparkles,
};

interface IndustryPageTemplateProps {
  industry: IndustryData;
}

export function IndustryPageTemplate({ industry }: IndustryPageTemplateProps) {
  const t = useTranslations("industry");
  const HeroIcon = HERO_ICONS[industry.heroIcon] ?? Wrench;

  return (
    <>
      {/* 1. Hero */}
      <section
        className="pt-28 pb-16 md:pt-32 md:pb-20 relative overflow-hidden bg-[var(--bg-base)]"
      >
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse 800px 400px at 100% 0%, rgba(59,130,246,0.12), transparent 50%)",
            opacity: 0.9,
          }}
        />
        <Container className="relative z-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] items-center">
            <div>
              <p
                className="text-sm font-medium mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("heroSubtitle")}
              </p>
              <p
                className="section-label mb-2"
                style={{ color: "var(--accent-primary)" }}
              >
                {t("solutionsLabel")}
              </p>
              <h1
                className="font-bold text-3xl md:text-4xl lg:text-5xl mb-4"
                style={{
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                  color: "#F8FAFC",
                }}
              >
                {t("heroTitle", { industry: industry.name })}
              </h1>
              <p
                className="text-lg md:text-xl max-w-xl"
                style={{ color: "#94A3B8", lineHeight: 1.6 }}
              >
                {t("heroTagline", { customerType: industry.customerType })}
              </p>
            </div>
            <div
              className="hidden lg:flex items-center justify-center w-48 h-48 rounded-2xl"
              style={{
                background: "rgba(30, 58, 138, 0.3)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
              }}
            >
              <HeroIcon className="w-24 h-24" style={{ color: "#93C5FD" }} />
            </div>
          </div>
        </Container>
      </section>

      {/* 2. The Problem — 3 stat cards */}
      <section
        className="py-16 md:py-20"
        style={{ background: "var(--bg-surface)" }}
      >
        <Container>
          <p
            className="section-label mb-4 text-center"
            style={{ color: "var(--accent-primary)" }}
          >
            {t("problemLabel")}
          </p>
          <h2
            className="font-semibold text-2xl md:text-3xl text-center max-w-2xl mx-auto mb-12"
            style={{
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            Missed calls cost {industry.name.toLowerCase()} businesses every day.
          </h2>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto">
            {industry.problemStats.map((stat, i) => {
              const Icon = STAT_ICONS[stat.icon] ?? DollarSign;
              return (
                <div
                  key={i}
                  className="card-marketing p-6 md:p-8 flex flex-col"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{
                      background: "var(--accent-primary-subtle)",
                      color: "var(--accent-primary)",
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className="text-2xl md:text-3xl font-bold block mb-2"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    {stat.value}
                  </span>
                  <p
                    className="text-sm"
                    style={{
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                    }}
                  >
                    {stat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 3. How It Works — Connect, Teach, Relax */}
      <section
        className="py-16 md:py-20"
        style={{ background: "var(--bg-primary)" }}
      >
        <Container>
          <SectionLabel>{t("howItWorks")}</SectionLabel>
          <h2
            className="font-semibold text-2xl md:text-3xl max-w-2xl mb-12"
            style={{
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            {t("stepsHeading")}
          </h2>
          <div className="grid md:grid-cols-3 gap-8 md:gap-6">
            {industry.howItWorks.map((step, i) => {
              const Icon =
                HOW_IT_WORKS_ICONS[
                  step.title === "Connect"
                    ? "Link2"
                    : step.title === "Teach"
                      ? "Brain"
                      : "Sparkles"
                ];
              return (
                <div
                  key={step.title}
                  className="card-marketing p-6 md:p-8 flex flex-col"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold mb-4"
                    style={{
                      background: "var(--accent-primary)",
                      color: "#fff",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{
                      background: "var(--accent-primary-subtle)",
                      color: "var(--accent-primary)",
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3
                    className="font-semibold text-lg mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-sm"
                    style={{
                      color: "var(--text-secondary)",
                      lineHeight: 1.65,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 4. Key Capabilities — 4 feature cards */}
      <section
        className="py-16 md:py-20"
        style={{ background: "var(--bg-surface)" }}
      >
        <Container>
          <SectionLabel>{t("capabilitiesLabel")}</SectionLabel>
          <h2
            className="font-semibold text-2xl md:text-3xl max-w-2xl mb-12"
            style={{
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            Built for {industry.name.toLowerCase()} workflows.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {industry.capabilities.map((cap, i) => {
              const Icon = CAPABILITY_ICONS[cap.icon] ?? Zap;
              return (
                <div
                  key={i}
                  className="card-marketing p-6 flex flex-col"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{
                      background: "var(--accent-primary-subtle)",
                      color: "var(--accent-primary)",
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3
                    className="font-semibold text-base mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {cap.title}
                  </h3>
                  <p
                    className="text-sm"
                    style={{
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    {cap.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 5. ROI Section */}
      <section
        className="py-16 md:py-20"
        style={{ background: "var(--bg-primary)" }}
      >
        <Container>
          <SectionLabel>{t("roiLabel")}</SectionLabel>
          <div
            className="card-marketing p-8 md:p-10 max-w-3xl"
            style={{ borderColor: "var(--accent-primary)" }}
          >
            <p
              className="text-base md:text-lg mb-4"
              style={{
                color: "var(--text-secondary)",
                lineHeight: 1.7,
              }}
            >
              The average {industry.name.toLowerCase()} business misses{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {industry.roi.missedCallsPerWeek} calls per week
              </strong>
              . At{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                ${industry.roi.avgValueNumber.toLocaleString()} per {industry.roi.avgValueLabel}
              </strong>
              , that&apos;s{" "}
              <strong
                style={{
                  color: "var(--accent-primary)",
                }}
              >
                ${industry.roi.recoveredPerMonth.toLocaleString()}/month
              </strong>{" "}
              in lost revenue.
            </p>
            <p
              className="text-base md:text-lg font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Recall Touch pays for itself in{" "}
              {industry.roi.paybackDays != null
                ? `${industry.roi.paybackDays} day${industry.roi.paybackDays === 1 ? "" : "s"}`
                : "days"}
              .
            </p>
          </div>
        </Container>
      </section>

      {/* 6. CTA Section */}
      <section
        className="py-16 md:py-20"
        style={{ background: "var(--bg-surface)" }}
      >
        <Container>
          <div className="text-center max-w-2xl mx-auto">
            <h2
              className="font-semibold text-2xl md:text-3xl mb-6"
              style={{
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                color: "var(--text-primary)",
              }}
            >
              {industry.ctaHeadline}
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={ROUTES.START}
                className="btn-marketing-primary inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold no-underline"
              >
                {t("ctaStartFree")}
              </Link>
              <Link
                href={ROUTES.PRICING}
                className="btn-marketing-ghost inline-flex items-center justify-center px-6 py-3 rounded-xl font-medium border no-underline"
              >
                {t("ctaPricing")}
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
