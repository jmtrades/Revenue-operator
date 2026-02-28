"use client";

import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { Phone, Clock, FileCheck, ArrowUpRight, Layers } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { motion } from "framer-motion";
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

const USE_CASES = [
  { icon: ArrowDownToLine, title: "Inbound operations", desc: "Teams handling inbound enquiries where every response must be consistent, documented, and legally defensible.", href: "#governance" },
  { icon: ArrowUpFromLine, title: "Outbound sales", desc: "Revenue teams making outbound calls where pricing commitments, verbal agreements, and follow-ups need a compliance trail.", href: "#followups" },
  { icon: Building2, title: "Regulated industries", desc: "Organizations in financial services, insurance, healthcare, or legal where call documentation isn't optional — it's a regulatory requirement.", href: "#compliance" },
];

export default function ProductPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }} className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <section className="max-w-3xl mb-24">
            <p className="section-label mb-4">Product</p>
            <h1 className="font-bold text-3xl md:text-4xl mb-6" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              See what governed execution looks like.
            </h1>
            <p className="text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
              Every feature designed for compliance-grade commercial operations.
            </p>
          </section>

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
            <h2 className="font-semibold text-2xl mb-4" style={{ color: "var(--text-primary)" }}>If revenue depends on conversation, govern it.</h2>
            <p className="text-base mb-8 max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>Start in under 60 seconds. No credit card required.</p>
            <Link href={ROUTES.START} className="btn-marketing-primary btn-lg no-underline inline-block">
              Start free →
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
    </motion.div>
  );
}
