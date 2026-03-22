"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { PhoneOff, Calendar, UserX, Flame, Wrench, HeartPulse, Home, Scale, Sparkles, Droplet, Building2 } from "lucide-react";

const INDUSTRY_DATA = [
  { id: "hvac", label: "HVAC", icon: Wrench, avgJob: 450, missedPerWeek: 2, annualLoss: 46800 },
  { id: "dental", label: "Multi-location Dental", icon: HeartPulse, avgJob: 1200, missedPerWeek: 3, annualLoss: 187200 },
  { id: "realestate", label: "Real Estate", icon: Home, avgJob: 12000, missedPerWeek: 1, annualLoss: 624000 },
  { id: "legal", label: "Legal", icon: Scale, avgJob: 4000, missedPerWeek: 2, annualLoss: 416000 },
  { id: "medspa", label: "Med Spa", icon: Sparkles, avgJob: 600, missedPerWeek: 2, annualLoss: 62400 },
  { id: "plumbing", label: "Plumbing", icon: Droplet, avgJob: 300, missedPerWeek: 4, annualLoss: 62400 },
  { id: "roofing", label: "Roofing", icon: Building2, avgJob: 800, missedPerWeek: 2, annualLoss: 83200 },
] as const;

function AnimatedNumber({ value, prefix = "$" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 800;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className="tabular-nums">
      {prefix}{display.toLocaleString()}
    </span>
  );
}

export function ProblemStatement() {
  const t = useTranslations("homepage.problemStatement");
  const [selectedIndustry, setSelectedIndustry] = useState(0);
  const industry = INDUSTRY_DATA[selectedIndustry];

  return (
    <section
      id="problem"
      className="marketing-section py-20 md:py-28"
      style={{ background: "var(--gradient-problem-bg)" }}
    >
      <Container>
        <AnimateOnScroll className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2
              className="font-bold text-2xl md:text-4xl"
              style={{
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                color: "var(--text-primary)",
              }}
            >
              {t("title")}{" "}
              <span className="text-red-400">{t("subtitle")}</span>
            </h2>
            <p
              className="text-base md:text-lg max-w-2xl mx-auto"
              style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
            >
              {t("description")}{" "}
              <span className="text-red-400 font-semibold">{t("costRange")}</span> {t("descriptionSuffix")}
            </p>
          </div>

          {/* Problem areas grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-5 text-center">
              <PhoneOff className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-white">{t("problem1.title")}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{t("problem1.description")}</p>
            </div>
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.05] p-5 text-center">
              <Calendar className="w-8 h-8 text-orange-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-white">{t("problem2.title")}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{t("problem2.description")}</p>
            </div>
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/[0.05] p-5 text-center">
              <UserX className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-white">{t("problem3.title")}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{t("problem3.description")}</p>
            </div>
          </div>

          {/* Industry-specific pain */}
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              {t("industryLabel")}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {INDUSTRY_DATA.map((ind, i) => (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => setSelectedIndustry(i)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: i === selectedIndustry ? "var(--accent-primary)" : "rgba(255,255,255,0.05)",
                    color: i === selectedIndustry ? "#000" : "var(--text-secondary)",
                    border: i === selectedIndustry ? "1px solid var(--accent-primary)" : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <ind.icon className="w-4 h-4 inline mr-1" /> {ind.label}
                </button>
              ))}
            </div>

            <div className="inline-flex flex-col items-center gap-2 rounded-2xl border border-red-500/20 bg-black/40 px-8 py-5">
              <div className="flex items-center gap-2 text-red-400">
                <Flame className="w-5 h-5" />
                <p className="text-xs uppercase tracking-wide">
                  {industry.label} — {t("estimatedAnnualLoss")}
                </p>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-red-400">
                <AnimatedNumber value={industry.annualLoss} />
                <span className="text-lg text-red-400/70">{t("perYear")}</span>
              </p>
              <p className="text-sm text-[var(--text-tertiary)]">
                {t("calculationPrefix")} {industry.label} {t("calculationMiddle")}: ${industry.avgJob} × {industry.missedPerWeek} {t("calculationSuffix")}
              </p>
            </div>
          </div>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
