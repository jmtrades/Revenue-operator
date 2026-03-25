import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Phone, PhoneOutgoing, Repeat, CalendarCheck, BarChart3, Brain, DollarSign, Zap, AudioWaveform } from "lucide-react";

const Navbar = dynamic(() => import("@/components/sections/Navbar").then((m) => m.Navbar));
const Footer = dynamic(() => import("@/components/sections/Footer").then((m) => m.Footer));

export const metadata: Metadata = {
  title: "Features — AI Phone Agents That Handle Everything",
  description:
    "Inbound call handling, outbound campaigns, automated follow-ups, appointment booking, revenue recovery, self-learning AI, and full analytics. See every feature Recall Touch offers.",
};

const FEATURES = [
  {
    icon: AudioWaveform,
    title: "32 Human-Quality AI Voices",
    description:
      "Every voice in the Recall Touch library was engineered for natural conversation. Natural pauses, real intonation, pitch variation, conversational warmth, and even subtle breathing. Most callers can't tell the difference — but don't take our word for it, listen for yourself. Choose from 32 voices across 8 accents, 3 genders, and 10 tonal styles — or clone your own voice.",
    href: "/demo/voice",
    color: "#10B981",
  },
  {
    icon: Phone,
    title: "Inbound Call Handling",
    description:
      "AI answers every call within 2 rings. Natural conversation powered by LLM. Personalized greetings for known callers. Real-time sentiment detection. Intelligent call routing. Business hours awareness. Multi-language support. No busy signals, ever.",
    href: "/features/inbound",
    color: "#10B981",
  },
  {
    icon: PhoneOutgoing,
    title: "Outbound Calling",
    description:
      "Speed-to-lead callbacks in under 60 seconds. 10 campaign types: follow-up, reminders, re-engagement, win-back, cold outreach, surveys, payment reminders, and more. DNC compliance, retry logic, and real-time campaign dashboards.",
    href: "/features/outbound",
    color: "#3B82F6",
  },
  {
    icon: Repeat,
    title: "Automated Follow-Up",
    description:
      "Multi-step sequences across calls, SMS, and email. Configurable cadence per lead. Auto-SMS after every call. Escalation rules based on sentiment and keywords. Auto-tagging and lead scoring. Nothing falls through the cracks.",
    href: "/features/follow-up",
    color: "#8B5CF6",
  },
  {
    icon: CalendarCheck,
    title: "Appointment Booking",
    description:
      "AI books appointments directly into your calendar. Google Calendar and Cal.com sync. Automatic reminders 24h and 1h before. No-show detection triggers AI reschedule calls. Availability management built in.",
    href: "/features/appointments",
    color: "#F59E0B",
  },
  {
    icon: DollarSign,
    title: "Revenue Recovery",
    description:
      "Automatically detects unanswered calls, cold leads, no-shows, open quotes, and dormant customers. Estimates dollar amounts at risk. One-click recovery actions. The Revenue At Risk widget shows exactly what you're losing and how to fix it.",
    href: "/features/revenue-recovery",
    color: "#EF4444",
  },
  {
    icon: Brain,
    title: "Self-Learning AI",
    description:
      "After every call, the AI analyzes what worked. Knowledge gaps are surfaced automatically — add an answer once, and every future call handles it. Prompt optimization suggestions after 50+ calls. Your AI gets measurably better every week.",
    href: "/features/self-learning",
    color: "#06B6D4",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    description:
      "Call volume trends, peak hours, outcome distribution. Agent performance: resolution rate, booking rate, sentiment scores. Campaign ROI. Revenue recovered vs at risk. Knowledge gap reports. Weekly email digests. Exportable PDF/CSV.",
    href: "/features/analytics",
    color: "#EC4899",
  },
  {
    icon: Zap,
    title: "Integrations",
    description:
      "Google Calendar, Cal.com, Slack, Zapier, Make.com, webhooks, and REST API. Connect your CRM, project management, and communication tools. GoHighLevel and HubSpot sync for agency and sales teams.",
    href: "/features/integrations",
    color: "#14B8A6",
  },
];

export default function FeaturesPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <Navbar initialAuthenticated={false} />
      <main className="pt-28 pb-24">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <p
              className="text-xs font-medium uppercase tracking-widest mb-4"
              style={{ color: "var(--accent-primary)" }}
            >
              Features
            </p>
            <h1
              className="font-bold text-3xl md:text-5xl mb-4"
              style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
            >
              Everything your phone needs. Nothing it doesn&apos;t.
            </h1>
            <p
              className="text-base md:text-lg max-w-2xl mx-auto"
              style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
            >
              Recall Touch replaces your front desk, your SDR, your follow-up process, and your missed-call anxiety — with one AI employee that works 24/7 and gets smarter with every conversation.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-20">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border p-8 transition-all hover:border-emerald-500/30"
                  style={{
                    borderColor: "var(--border-default)",
                    background: "var(--bg-surface)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: `${feature.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: feature.color }} />
                  </div>
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed mb-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="text-center">
            <h2
              className="font-bold text-2xl md:text-3xl mb-4"
              style={{ letterSpacing: "-0.02em" }}
            >
              Ready to stop losing revenue?
            </h2>
            <p
              className="text-base mb-6 max-w-lg mx-auto"
              style={{ color: "var(--text-secondary)" }}
            >
              Start your free trial. No credit card. Your AI agent will be answering calls in under 3 minutes.
            </p>
            <Link
              href="/activate"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold rounded-xl px-8 py-4 hover:bg-[var(--bg-hover)] transition-colors no-underline text-lg"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
