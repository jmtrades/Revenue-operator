import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { Phone, Clock, FileCheck, ArrowUpRight, Layers } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import {
  WaveformVisual,
  TimelineVisual,
  ComplianceRecordPreview,
  EscalationFlowVisual,
  ChannelIconsVisual,
} from "@/components/sections/BentoVisuals";
import { ArrowDownToLine, ArrowUpFromLine, Building2 } from "lucide-react";

const FEATURES = [
  {
    id: "governance",
    icon: Phone,
    iconBox: "primary",
    title: "Every call. Recorded. Governed.",
    paragraphs: [
      "Recall Touch records every inbound and outbound call automatically. Each recording is transcribed, timestamped, and tagged under your declared compliance framework — before any human reviews it.",
      "No manual logging. No missed calls. The system captures everything — no one has to remember to hit record.",
      "Transcripts are searchable, filterable by jurisdiction, and linked to the contact record. Pull any call from the last 12 months in seconds.",
    ],
    visual: WaveformVisual,
    align: "left",
  },
  {
    id: "followups",
    icon: Clock,
    iconBox: "primary",
    title: "Commitments become scheduled actions.",
    paragraphs: [
      "When a rep says \"I'll send that over by Friday,\" Recall Touch captures the commitment and creates a follow-up task automatically. Deadlines are enforced, not hoped for.",
      "Follow-up sequences are configurable: one reminder, three reminders, escalation on miss. Every step is documented in the call record.",
      "No more \"I thought someone was handling that.\" The record shows exactly who committed, when, and whether it was fulfilled.",
    ],
    visual: TimelineVisual,
    align: "right",
  },
  {
    id: "compliance",
    icon: FileCheck,
    iconBox: "secondary",
    title: "Records that survive regulatory scrutiny.",
    paragraphs: [
      "Every governed call produces a compliance record — a single document containing the recording, transcript, timestamps, jurisdiction metadata, and chain of custody. It can be forwarded to legal, submitted to a regulator, or archived without any modification.",
      "Records are jurisdiction-aware. Whether the call falls under United States state regulations, EU GDPR requirements, or UK FCA rules, the record is tagged and structured accordingly.",
      "Chain of custody means you know exactly who accessed, forwarded, or modified each record. Audit trail included by default.",
    ],
    visual: ComplianceRecordPreview,
    align: "left",
  },
  {
    id: "escalation",
    icon: ArrowUpRight,
    iconBox: "warning",
    title: "Escalations with full documentation.",
    paragraphs: [
      "When a call needs to move up the chain — from agent to manager to director — it moves through a defined path. Not a Slack message. Not a hallway conversation. A documented, recorded handoff.",
      "Each escalation level has its own review criteria, response windows, and documentation requirements. Miss a window and the system escalates automatically.",
      "When a dispute reaches legal, every escalation step is already documented. No reconstructing timelines from memory.",
    ],
    visual: EscalationFlowVisual,
    align: "right",
  },
  {
    id: "multichannel",
    icon: Layers,
    iconBox: "primary",
    title: "One governance layer. Every channel.",
    paragraphs: [
      "Voice calls, payment confirmation calls, follow-up conversations, SMS confirmations — all handled under the same compliance framework. One set of rules. One record format. One audit trail.",
      "Operators don't need to switch between systems or remember which channel has which requirements. The governance layer is invisible to them — but present on everything.",
      "As you add channels, the governance extends automatically. No per-channel configuration. No gaps.",
    ],
    visual: ChannelIconsVisual,
    align: "left",
  },
];

const PRODUCT_SECTIONS = [
  { id: "answers-every-call", title: "Answers every call", desc: "Your AI picks up on the first ring, 24/7/365. No voicemail. No hold music. Natural conversational voice handles everything from simple questions to complex scheduling. Whether it's 2 AM or your busiest hour, every caller gets the same professional experience.", bullets: ["First ring answer", "24/7/365", "Natural voice", "No voicemail"] },
  { id: "outbound", title: "Makes outbound calls", desc: "New web lead? Your AI calls back within 60 seconds. Appointment tomorrow? Confirmation call the evening before. No-show? Automatic reschedule. Customer hasn't returned in 6 months? Reactivation follow-up. Your AI follows up so your team handles work that requires a human.", bullets: ["60-second callback", "Appointment reminders", "No-show recovery", "Reactivation"] },
  { id: "agents", title: "Agent studio", desc: "Build your AI agent without code. Start from 20+ industry templates or from scratch. Choose voice, personality, greeting, knowledge base, business rules. Test with a real call before going live. Edit anytime — changes are instant.", bullets: ["No code", "20+ templates", "Voice & personality", "Test before live"] },
  { id: "leads", title: "Lead capture & scoring", desc: "Every call auto-extracts name, phone, address, service needed, urgency. Each lead scored 0-100 on intent signals. Instant text + email notification. No more sticky notes or forgotten follow-ups.", bullets: ["Auto-extract details", "Score 0-100", "Instant alerts", "Activity feed"] },
  { id: "appointments", title: "Appointment booking", desc: "Checks Google Calendar or Outlook in real-time, offers available slots, books, confirms via text. Sends reminders before. Reschedules no-shows automatically. Calendar stays full without you lifting a finger.", bullets: ["Calendar sync", "Real-time availability", "Confirmations & reminders", "No-show reschedule"] },
  { id: "messaging", title: "Smart messaging", desc: "Two-way SMS from your business number. Auto-confirmations after bookings. Follow-up sequences for leads who didn't convert. Review requests after appointments. One inbox for all conversations.", bullets: ["Two-way SMS", "Auto-confirmations", "Follow-up sequences", "One inbox"] },
  { id: "insights", title: "Analytics & ROI", desc: "Call volume, answer rate, lead conversion, appointment completion, revenue recovered. Usage meter shows minutes vs plan. Monthly ROI statement: your AI captured X leads, booked Y appointments worth $Z. Cost: $97. ROI: clear.", bullets: ["Call volume & answer rate", "Lead conversion", "Revenue recovered", "Usage meter"] },
  { id: "compliance", title: "Compliance", desc: "Every call recorded and transcribed. HIPAA mode available. Retention 30-365 days. Full audit trail. Data export. Industry-ready documentation.", bullets: ["Recording & transcription", "HIPAA option", "Retention 30-365 days", "Audit trail"] },
];

const USE_CASES = [
  { icon: ArrowDownToLine, title: "Inbound operations", desc: "Teams handling inbound enquiries where every response must be consistent, documented, and legally defensible.", href: "#governance" },
  { icon: ArrowUpFromLine, title: "Outbound sales", desc: "Revenue teams making outbound calls where pricing commitments, verbal agreements, and follow-ups need a compliance trail.", href: "#followups" },
  { icon: Building2, title: "Regulated industries", desc: "Organizations in financial services, insurance, healthcare, or legal where call documentation isn't optional — it's a regulatory requirement.", href: "#compliance" },
];

export const metadata = {
  title: "Product",
  description: "See how Recall Touch answers every call, books appointments, follows up with leads, and keeps every conversation documented.",
};

export default function ProductPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <section className="max-w-3xl mb-24">
            <p className="section-label mb-4">Product</p>
            <h1 className="font-bold text-3xl md:text-4xl mb-6" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Your AI phone system. Every call answered. Every lead captured.
            </h1>
            <p className="text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
              Answer calls 24/7, book appointments, follow up with leads, and keep every conversation documented.
            </p>
          </section>

          <div className="space-y-20 mb-24">
            {PRODUCT_SECTIONS.map((s, i) => (
              <div key={s.id}>
                {i === 4 && (
                  <div className="mb-20 p-6 rounded-2xl border text-center" style={{ borderColor: "var(--accent-primary)", background: "var(--accent-primary-subtle)" }}>
                    <p className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
                      Enterprise voice AI: $150,000/year + 6 weeks. Recall Touch: $97/month + 5 minutes.
                    </p>
                  </div>
                )}
                <section id={s.id} className={"grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-start " + (i % 2 === 1 ? "md:grid-flow-dense" : "")}>
                  <div className={i % 2 === 1 ? "md:col-start-2" : ""}>
                    <h2 className="font-semibold text-xl md:text-2xl mb-4" style={{ color: "var(--text-primary)" }}>{s.title}</h2>
                    <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{s.desc}</p>
                    <ul className="space-y-1.5">
                      {s.bullets.map((b) => (
                        <li key={b} className="text-sm flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent-primary)" }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={i % 2 === 1 ? "md:col-start-1 md:row-start-1" : ""} />
                </section>
              </div>
            ))}
          </div>

          <div className="space-y-24 md:space-y-32">
            {FEATURES.map((f) => {
              const Visual = f.visual;
              const iconBg = f.iconBox === "secondary" ? "var(--accent-secondary)" : f.iconBox === "warning" ? "var(--accent-warning)" : "var(--accent-primary)";
              const iconBoxBg = f.iconBox === "secondary" ? "var(--accent-secondary-subtle, rgba(0,212,170,0.08))" : f.iconBox === "warning" ? "var(--accent-warning-subtle)" : "var(--accent-primary-subtle)";
              return (
                <section key={f.id} id={f.id} className={"grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center " + (f.align === "right" ? "md:grid-flow-dense" : "")}>
                  <div className={f.align === "right" ? "md:col-start-2" : ""}>
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-6" style={{ background: iconBoxBg, color: iconBg }}>
                      <f.icon className="w-6 h-6" />
                    </div>
                    <h2 className="font-semibold text-2xl mb-6" style={{ color: "var(--text-primary)" }}>{f.title}</h2>
                    <div className="space-y-4">
                      {f.paragraphs.map((p, i) => (
                        <p key={i} className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{p}</p>
                      ))}
                    </div>
                  </div>
                  <div className={"min-h-[200px] flex items-center " + (f.align === "right" ? "md:col-start-1 md:row-start-1" : "")}>
                    <div className="w-full opacity-90">
                      <Visual />
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <section className="mt-24 pt-16 border-t" style={{ borderColor: "var(--border-default)" }}>
            <h2 className="font-semibold text-2xl mb-8 text-center" style={{ color: "var(--text-primary)" }}>Built for how you work</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {USE_CASES.map((c) => (
                <div key={c.title} className="card-marketing p-8 flex flex-col">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                    <c.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{c.title}</h3>
                  <p className="text-sm flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{c.desc}</p>
                  <Link href={c.href} className="text-sm font-medium mt-4 inline-block" style={{ color: "var(--accent-primary)" }}>Learn more →</Link>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-24 py-16 text-center" style={{ background: "var(--gradient-cta-section)", borderTop: "1px solid var(--border-default)", borderBottom: "1px solid var(--border-default)" }}>
            <p className="text-sm font-medium mb-4" style={{ color: "var(--accent-primary)" }}>Enterprise voice AI: $150,000/year + 6 weeks. Recall Touch: $97/month + 5 minutes.</p>
            <h2 className="font-semibold text-2xl mb-4" style={{ color: "var(--text-primary)" }}>If revenue depends on conversation, govern it.</h2>
            <p className="text-base mb-8 max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>Start in under 60 seconds. No credit card required.</p>
            <Link href={ROUTES.START} className="btn-marketing-primary btn-lg no-underline inline-block">
              Start free → takes 5 minutes
            </Link>
            <p className="text-sm mt-6" style={{ color: "var(--text-tertiary)" }}>
              Or: <Link href={ROUTES.CONTACT} className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded" style={{ color: "var(--text-tertiary)" }}>Book a demo</Link>
              {" · "}
              <Link href={ROUTES.DOCS} className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded" style={{ color: "var(--text-tertiary)" }}>View documentation</Link>
            </p>
          </section>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
