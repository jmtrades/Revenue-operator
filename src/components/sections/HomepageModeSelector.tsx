"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, Building2, User, Check } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ROUTES } from "@/lib/constants";

type ModeKey = "solo" | "sales" | "business";

const MODES: Array<{
  key: ModeKey;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  bullets: string[];
}> = [
  {
    key: "solo",
    name: "Solo",
    description: "Automate your communication and follow-up so nothing falls through the cracks.",
    icon: User,
    bullets: ["Automated follow-up sequences", "Opportunity capture", "Revenue dashboard"],
  },
  {
    key: "sales",
    name: "Sales",
    description: "Run outbound campaigns, qualify leads, and book meetings at scale.",
    icon: BriefcaseBusiness,
    bullets: ["Lead routing + qualification", "Outbound sequences", "Pipeline attribution"],
  },
  {
    key: "business",
    name: "Business",
    description: "Full revenue operations — inbound, outbound, booking, follow-up, and attribution.",
    icon: Building2,
    bullets: ["AI revenue operations engine", "Booking + reminders + escalation", "Full revenue attribution"],
  },
];

export function HomepageModeSelector() {
  const [mode, setMode] = useState<ModeKey>("business");

  const active = useMemo(() => MODES.find((m) => m.key === mode) ?? MODES[2], [mode]);
  const ActiveIcon = active.icon;

  return (
    <section className="marketing-section" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <div className="text-center mb-10">
          <SectionLabel>Three modes. One execution engine.</SectionLabel>
          <h2
            className="font-semibold max-w-3xl mx-auto"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            Pick the lens that matches how you work.
          </h2>
          <p className="mt-3 text-base max-w-2xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            You can switch anytime. Your data stays intact — only the dashboard, defaults, and language change.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex rounded-2xl border border-[var(--border-default)] bg-black/20 p-1">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  mode === m.key ? "bg-white text-black" : "text-white/70 hover:text-white"
                }`}
                aria-pressed={mode === m.key}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-stretch">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/50 p-6 md:p-8">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-inset)] border border-[var(--border-default)]">
                <ActiveIcon className="h-5 w-5 text-white/80" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{active.name} mode</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{active.description}</p>
              </div>
            </div>

            <ul className="mt-6 space-y-2 text-sm text-white/70">
              {active.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {b}</li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                href={ROUTES.START}
                className="bg-white text-black font-semibold rounded-xl px-6 py-3 hover:opacity-90 transition-colors no-underline text-center"
              >
                Get started →
              </Link>
              <Link
                href={ROUTES.DEMO}
                className="border border-[var(--border-default)] text-white/90 font-medium rounded-xl px-6 py-3 hover:bg-[var(--bg-hover)] transition-colors no-underline text-center"
              >
                Watch the demo →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-default)] bg-black/20 p-6 md:p-8 overflow-hidden relative">
            <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_20%_20%,white_0,transparent_55%),radial-gradient(circle_at_80%_30%,white_0,transparent_60%)]" />
            <div className="relative">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Preview
              </p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-4">
                  <p className="text-xs text-white/45">Morning brief</p>
                  <p className="mt-1 text-sm text-white">
                    12 calls answered · 4 appointments booked · ~$3,200 recovered
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-4">
                  <p className="text-xs text-white/45">Needs attention</p>
                  <p className="mt-1 text-sm text-white/70">
                    3 new leads need a callback · 2 no-shows can be recovered today
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-4">
                  <p className="text-xs text-white/45">Next action</p>
                  <p className="mt-1 text-sm text-white/70">
                    Send a follow-up text to Mike Johnson · schedule a callback window
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-[var(--text-tertiary)]">
                The same engine drives each mode — only the defaults change.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

