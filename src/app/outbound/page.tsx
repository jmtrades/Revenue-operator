import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  Zap,
  ClipboardCheck,
  CalendarClock,
  RefreshCw,
  Snowflake,
  FileText,
  Star,
  Megaphone,
  Calendar,
  SlidersHorizontal,
} from "lucide-react";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "AI Outbound Campaigns — Recall Touch",
  description:
    "Automated outbound calling with compliance guardrails: suppression rules, business hours enforcement, DNC checks, and measurable revenue outcomes.",
  alternates: { canonical: `${BASE}/outbound` },
  openGraph: {
    title: "AI Outbound Campaigns — Recall Touch",
    description:
      "Automated outbound calling with compliance guardrails: suppression rules, business hours enforcement, DNC checks, and measurable revenue outcomes.",
    url: `${BASE}/outbound`,
    siteName: "Recall Touch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Outbound Campaigns — Recall Touch",
    description: "Automated outbound calling with compliance guardrails and measurable revenue outcomes.",
  },
};

type CampaignCard = {
  id:
    | "speed_to_lead"
    | "lead_qualification"
    | "appointment_setting"
    | "no_show_recovery"
    | "reactivation"
    | "quote_chase"
    | "review_request"
    | "cold_outreach"
    | "appointment_reminder"
    | "custom";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
};

const CAMPAIGN_TYPES: CampaignCard[] = [
  { id: "speed_to_lead", icon: Zap, label: "Speed-to-Lead", description: "Text in 5 minutes, call if no reply." },
  { id: "lead_qualification", icon: ClipboardCheck, label: "Lead Qualification", description: "Qualify interest and book the next step." },
  { id: "appointment_setting", icon: CalendarClock, label: "Appointment Setting", description: "Call and text until an appointment is set." },
  { id: "appointment_reminder", icon: Calendar, label: "Appointment Reminder", description: "24h and 1h reminders to reduce no-shows." },
  { id: "no_show_recovery", icon: RefreshCw, label: "No-Show Recovery", description: "Recover missed appointments with follow-up." },
  { id: "reactivation", icon: Snowflake, label: "Reactivation", description: "Re-engage inactive contacts." },
  { id: "quote_chase", icon: FileText, label: "Quote Chase", description: "Follow up on pending quotes." },
  { id: "review_request", icon: Star, label: "Review Request", description: "Request a review after completion." },
  { id: "cold_outreach", icon: Megaphone, label: "Cold Outreach", description: "Reach a list with a controlled cadence." },
  { id: "custom", icon: SlidersHorizontal, label: "Custom", description: "Build your own sequence." },
];

export default function OutboundPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main id="main">
        <section className="marketing-section py-20 md:py-28" style={{ background: "var(--bg-primary, #FAFAF8)" }}>
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <SectionLabel>Outbound</SectionLabel>
              <h1 className="font-bold text-4xl md:text-6xl leading-tight">Outbound That Actually Works</h1>
              <p className="mt-4 text-base md:text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Create outbound campaigns that call, text, qualify, and book appointments automatically — with compliance guardrails and measurable outcomes in your analytics.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/activate"
                  className="inline-flex px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-[var(--bg-hover)] transition-colors"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>
          </Container>
        </section>

        <section className="py-14 md:py-20">
          <Container>
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>10 Campaign Types</h2>
              <p className="mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Choose the play that matches your sales motion. Each campaign automatically chains calls + SMS into the next revenue step.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {CAMPAIGN_TYPES.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.id} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-4" data-campaign-type={c.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-[var(--accent-primary)]" />
                        <p className="font-semibold text-sm">{c.label}</p>
                      </div>
                      <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        {c.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </Container>
        </section>

        <section className="py-14 md:py-20">
          <Container>
            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 items-start">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Sequence Builder
                </h2>
                <p className="mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  Build your campaign flow in five steps: pick a type, define the audience, configure the sequence, set calling rules and schedule, then review before launch.
                </p>

                <div className="mt-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-6">
                  <div className="space-y-4">
                    {[
                      { step: "Type", hint: "Campaign type & goal" },
                      { step: "Audience", hint: "Who to contact and why" },
                      { step: "Sequence", hint: "Calls + SMS templates" },
                      { step: "Schedule", hint: "Business hours + limits" },
                      { step: "Review", hint: "Compliance check before launch" },
                    ].map((row) => (
                      <div key={row.step} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-hover)] p-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{row.step}</p>
                          <p className="text-sm" style={{ color: "var(--text-secondary)", marginTop: 2 }}>
                            {row.hint}
                          </p>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: "var(--accent-primary)" }}>
                          →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Compliance Built In
                </h2>
                <p className="mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  Outbound is only valuable when it&apos;s safe. Recall Touch applies suppression rules, business-hours constraints, and DNC checks so outreach stays responsible.
                </p>

                <ul className="mt-6 space-y-3" style={{ color: "var(--text-secondary)" }}>
                  {[
                    "Suppression rules to prevent over-contact and protect conversions",
                    "Business hours enforcement so calls only happen in your approved window",
                    "DNC registry checks and opt-out handling before any sends",
                    "Per-contact limits to prevent over-contact and protect conversion quality",
                  ].map((t) => (
                    <li key={t} className="flex gap-3 items-start">
                      <span className="mt-0.5 w-2 h-2 rounded-full" style={{ background: "var(--accent-primary)" }} />
                      <span className="text-sm" style={{ lineHeight: 1.6 }}>{t}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-hover)] p-6">
                  <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    Setter Workflows
                  </p>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    AI calls → qualifies the lead → books with the right next-step — with humans only where it matters.
                  </p>
                </div>
              </div>
            </div>
          </Container>
        </section>

        <section className="py-14 md:py-20">
          <Container>
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                Full Analytics
              </h2>
              <p className="mt-3" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Measure conversion rates, contact rates, and pipeline value across your outbound mix. Outcomes roll up into dashboards and drive smarter next actions.
              </p>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { k: "Conversion rate", v: "Calls → appointments → revenue recovered" },
                  { k: "Contact rate", v: "Answer + intent capture across your audience" },
                  { k: "Pipeline value", v: "Estimated value from follow-ups, bookings, and recovered no-shows" },
                ].map((card) => (
                  <div key={card.k} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-5">
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{card.k}</p>
                    <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{card.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}

