"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";

type FaqItem = { q: string; a: string };

const FAQS: FaqItem[] = [
  {
    q: "How fast can I be live?",
    a: "Most teams are live within minutes. Connect your number, configure your workflows, run a test, and go live. You can refine sequences and agent behavior after you see it working.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. 14 days. No credit card required. Full access to all features on your plan.",
  },
  {
    q: "Can I use my existing business number?",
    a: "Yes. Keep your current number and forward to Recall Touch, or provision new numbers directly.",
  },
  {
    q: "What exactly does Recall Touch do?",
    a: "Recall Touch is an AI revenue operations platform. It handles inbound and outbound communication, automated follow-up sequences, appointment booking, lead qualification, escalation to your team, and full revenue attribution. Think of it as the execution layer that runs your revenue operations automatically.",
  },
  {
    q: "Does the AI sound robotic?",
    a: "Not even close. Recall Touch uses 32 premium AI voices engineered with natural pauses, real intonation, pitch variation, and conversational warmth. Over 90% of callers don't realize they're speaking with AI.",
  },
  {
    q: "Who is this for?",
    a: "Any business or team that generates revenue through conversations. Solo consultants, sales teams, agencies, service businesses, clinics, law firms, real estate teams, recruiters, multi-location operators, and more. If you have leads, appointments, or follow-up to manage, Recall Touch runs it.",
  },
  {
    q: "Do I need to replace my CRM?",
    a: "No. Recall Touch is the execution layer that sits on top of your CRM. It handles communication, follow-up, booking, and attribution. Your CRM stays as your system of record.",
  },
  {
    q: "How do you prevent bad automation?",
    a: "Every agent has configurable guardrails: per-contact frequency limits, business hours enforcement, opt-out compliance, confidence thresholds, and human escalation rules. You can require approval before any action executes. Every action is logged and reviewable.",
  },
  {
    q: "Does this work for outbound too?",
    a: "Yes. Recall Touch supports 10 outbound campaign types including speed-to-lead, appointment setting, reactivation, quote follow-up, and cold outreach. Outbound runs with the same guardrails, compliance, and attribution as inbound.",
  },
  {
    q: "How is ROI measured?",
    a: "Every call, follow-up, and booking is attributed to revenue outcomes. Your dashboard shows exactly what the system produced, broken down by workflow, campaign, and agent. Weekly digest emails summarize performance.",
  },
  {
    q: "What if the AI makes a mistake?",
    a: "Full transparency. Review transcripts and recordings for any call. Adjust agent behavior, scripts, and escalation rules in real time. Run agents in sandbox mode to preview before going live. Every action has an audit trail.",
  },
];

export function HomepageFAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="marketing-section" style={{ background: "var(--bg-surface)" }}>
      <Container>
        <div className="text-center mb-10">
          <SectionLabel>FAQ</SectionLabel>
          <h2
            className="font-semibold max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(1.6rem, 3.2vw, 2.4rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            Everything You Need to Know
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {FAQS.map((item, idx) => {
            const expanded = open === idx;
            return (
              <div
                key={item.q}
                className="rounded-2xl border border-white/[0.08] bg-black/20 overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
                  onClick={() => setOpen((v) => (v === idx ? null : idx))}
                  aria-expanded={expanded}
                >
                  <span className="text-sm font-semibold text-white">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-white/60 transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
                {expanded && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-white/70 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
