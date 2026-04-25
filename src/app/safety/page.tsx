import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldOff,
  PhoneOff,
  Ban,
  AlertTriangle,
  Eye,
  Mic,
  UserCheck,
  Clock,
  Lock,
  Pill,
  Scale,
  CreditCard,
} from "lucide-react";
import { MarketingNavbar } from "@/components/sections/MarketingNavbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";

/**
 * Phase 87 — /safety page. Closes pre-mortem D3 (and partially A3 + B2):
 * buyers contemplating an AI phone agent are afraid of one thing above
 * all: it will say something wrong on a real call to a real customer.
 * The /trust page covers data + compliance abstractly. This page covers
 * the specific behavioural guardrails the agent runs against on every
 * call, in plain language a non-technical buyer can point to.
 *
 * Each item maps to a real phase shipped earlier in this codebase so the
 * claims are verifiable, not marketing puffery:
 *   - hallucination guard       → Phase 12c.5
 *   - DNC + opt-out enforcement → Phase 7 + Phase 24 + Phase 15
 *   - calling-hours rules       → Phase 11a (TCPA v2 holidays + states)
 *   - recording-consent TwiML   → Phase 7 Task 7.1 (two-party states)
 *   - emergency escalation      → Phase 11e
 *   - in-call consent revocation→ Phase 11c
 *   - human handoff on confidence drop → Phase 64 (HITL approval timers)
 */

export const metadata: Metadata = {
  title: "Agent Safety",
  description:
    "What your Revenue Operator AI agent is built to refuse to do. Concrete behavioural guardrails — TCPA, opt-out, two-party recording, hallucination guard, human escalation — backed by shipped code.",
  robots: { index: true, follow: true },
};

interface Guardrail {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  body: string;
  reference: string;
}

const NEVER_DOES: Guardrail[] = [
  {
    icon: Pill,
    title: "Will not give medical, legal, or financial advice",
    body: "On healthcare, legal, or financial calls, the agent stays inside intake, scheduling, and routing. It will not diagnose, recommend a treatment, interpret a contract, recommend an investment, or tell a caller whether they qualify for anything. It hands off to a licensed human when the conversation moves past intake.",
    reference: "Industry disclaimer engine — Phase 13d",
  },
  {
    icon: Ban,
    title: "Will not ignore an opt-out",
    body: "If a caller says STOP, unsubscribe, do-not-call, or any equivalent, the agent immediately ends outbound contact across every channel — voice, SMS, and email. The opt-out is recorded against the contact and persists across campaigns and workspaces. STOP keywords also hang up an active call mid-conversation.",
    reference: "DNC + opt-out enforcement — Phase 7 Tasks 7.2 / 7.3 / 7.4 + Phase 15",
  },
  {
    icon: Clock,
    title: "Will not dial outside legal calling hours",
    body: "The outbound dialer enforces TCPA calling-hour windows in the lead's local timezone, including federal holidays and per-state stricter rules (TX, FL, MA, NM, AL, etc). It will hold a queued call until the next legal window rather than dial out of compliance.",
    reference: "TCPA v2 — Phase 11a + Phase 7 Task 7.5",
  },
  {
    icon: Mic,
    title: "Will not record without consent in two-party states",
    body: "In states that require two-party consent for recording (CA, FL, IL, MD, MA, MT, NV, NH, PA, WA), the agent injects an explicit consent disclosure into the call's TwiML before any recording begins. If the caller declines, recording is skipped.",
    reference: "Recording consent disclosure — Phase 7 Task 7.1",
  },
  {
    icon: ShieldOff,
    title: "Will not fabricate facts about your business",
    body: "A hallucination guard runs against every reply. If the agent is about to say something it has no source for — a price, a feature, a guarantee, an operating-hour claim — it falls back to a safe deflection (\"let me get a teammate to confirm that exactly\") rather than invent.",
    reference: "Hallucination guard — Phase 12c.5",
  },
  {
    icon: CreditCard,
    title: "Will not take payment information over the phone",
    body: "The agent never collects credit card numbers, bank accounts, social security numbers, or other PCI/PII-restricted data on the call. If a caller offers it, the agent refuses and routes to your secure payment flow (link sent via SMS or email).",
    reference: "Built into the conversation policy at the model layer",
  },
  {
    icon: AlertTriangle,
    title: "Will not stay on a crisis call",
    body: "If the caller is in medical distress, mentions self-harm, or expresses an immediate emergency, the agent stops its scripted flow, surfaces a crisis-line referral, and either bridges to a human or hangs up cleanly so 911 isn't blocked.",
    reference: "Crisis / emergency escalation — Phase 11e",
  },
  {
    icon: PhoneOff,
    title: "Will not impersonate a human if asked directly",
    body: "If a caller asks \"am I talking to a person?\", the agent identifies itself as an AI assistant. We don't pretend to be human. The agent's voice and name are the same name your customers see on your dashboard.",
    reference: "Built into the conversation policy at the model layer",
  },
  {
    icon: UserCheck,
    title: "Will not push past a user revoking consent mid-call",
    body: "If a caller withdraws consent during a call (\"I'd rather not be recorded,\" \"please don't keep my information\"), the in-call detector picks it up in real time, the agent acknowledges, and the workspace's privacy policy fires (recording stops, transcript redacts, contact updates).",
    reference: "In-call consent revocation detector — Phase 11c",
  },
  {
    icon: Eye,
    title: "Will not act on a low-confidence answer",
    body: "When the agent's confidence drops below threshold — caller hard to understand, ambiguous question, edge of policy — it escalates rather than guess. Escalation routes to a configurable human approver with a context-rich brief; approval timers and rules are per-workspace.",
    reference: "Safety guardrails + HITL approval timers — Phase 64",
  },
  {
    icon: Lock,
    title: "Will not retain data longer than your settings allow",
    body: "Transcripts, recordings, and contact records honour your workspace retention policy. Customer-initiated GDPR / CCPA delete requests are processed end-to-end across calls, messages, leads, and analytics rollups.",
    reference: "Data subject request handler — Phase 27",
  },
  {
    icon: Scale,
    title: "Will not transfer the wrong call to your team",
    body: "Warm-transfer briefs are generated in real time from the call so far — caller's name, intent, what they've already been told, what's outstanding. Your team picks up with full context, not cold.",
    reference: "Warm-transfer context brief — Phase 12c.3",
  },
];

export default function SafetyPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <MarketingNavbar />
      <main className="pt-28 pb-24">
        <Container>
          <article className="max-w-[760px] mx-auto">
            <p
              className="eyebrow-editorial mb-5"
              style={{ color: "var(--accent-primary)" }}
            >
              Agent safety
            </p>
            <h1
              className="font-editorial mb-5"
              style={{
                fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
                color: "var(--text-primary)",
              }}
            >
              What your AI will <em className="ital">never</em> do.
            </h1>
            <p
              className="text-base md:text-lg mb-12 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              The fastest way to lose a customer with an AI phone agent is
              to put one on the line that says something wrong, calls
              outside legal hours, ignores an opt-out, or pushes past a
              compliance line. Revenue Operator is built around twelve
              concrete refusals — every one of them backed by shipped code,
              not marketing copy. If you have a compliance team, hand them
              this page.
            </p>

            <div className="rule-editorial mb-12" aria-hidden="true" />

            <ul className="space-y-10">
              {NEVER_DOES.map((g) => {
                const Icon = g.icon;
                return (
                  <li key={g.title} className="flex items-start gap-5">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-1"
                      style={{
                        background: "var(--accent-primary-subtle)",
                        color: "var(--accent-primary)",
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2
                        className="font-editorial-small mb-2"
                        style={{
                          fontSize: "1.25rem",
                          lineHeight: 1.25,
                          color: "var(--text-primary)",
                        }}
                      >
                        {g.title}
                      </h2>
                      <p
                        className="text-base leading-relaxed mb-2"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {g.body}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {g.reference}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="rule-editorial mt-16 mb-10" aria-hidden="true" />

            <section
              className="rounded-2xl p-7"
              style={{
                background: "var(--bg-inset)",
                border: "1px solid var(--border-default)",
              }}
            >
              <h2
                className="font-editorial-small mb-3"
                style={{
                  fontSize: "1.25rem",
                  lineHeight: 1.25,
                  color: "var(--text-primary)",
                }}
              >
                Found a behaviour we should add to this list?
              </h2>
              <p
                className="text-base mb-4 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                We treat the agent&apos;s refusal set as production code,
                not policy. If you find an edge case where the agent
                handles something in a way you wouldn&apos;t — too
                aggressive, too cautious, off-policy for your industry —
                tell us. We&apos;ll ship a fix or document the gap on this
                page within one business day.
              </p>
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                Email{" "}
                <a
                  href="mailto:safety@recall-touch.com"
                  className="underline"
                  style={{ color: "var(--accent-primary)" }}
                >
                  safety@recall-touch.com
                </a>{" "}
                or read the full{" "}
                <Link
                  href="/trust"
                  className="underline"
                  style={{ color: "var(--accent-primary)" }}
                >
                  Trust Center
                </Link>{" "}
                for data, encryption, and processing details.
              </p>
            </section>
          </article>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
