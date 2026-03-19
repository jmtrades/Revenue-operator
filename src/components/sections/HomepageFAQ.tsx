"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";

type FaqItem = { q: string; a: string };

const FAQS: FaqItem[] = [
  {
    q: "How is this different from an AI receptionist?",
    a: "An AI receptionist answers calls and takes messages. Recall Touch answers calls AND runs automated recovery sequences until the revenue is recovered — appointment booking, no-show recovery, reactivation campaigns, quote chasing, and ROI proof in your dashboard. The follow-up is what pays for itself.",
  },
  {
    q: "Do I need to replace my CRM?",
    a: "No. Recall Touch is the execution layer. Keep your CRM; we focus on answering, booking, follow-ups, and proof of ROI.",
  },
  {
    q: "How fast can I be live?",
    a: "Most workspaces can be live in minutes: choose an industry, connect your number (or add one), and run a test call. You can refine scripts and follow-ups after you’ve seen it work.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — 14 days. No credit card required.",
  },
  {
    q: "Can I use my existing business number?",
    a: "Yes. You can keep your number and forward calls, or add new numbers as needed.",
  },
  {
    q: "How do you prevent spammy automation?",
    a: "Guardrails: per-contact limits, quiet hours, opt-outs, and reviewable actions. You can require approval before anything sends.",
  },
  {
    q: "What industries do you support?",
    a: "We ship industry packs (scripts + defaults) for common service verticals and can run a high-quality “Other” preset if you don’t see yours.",
  },
  {
    q: "Does it work after hours?",
    a: "Yes. After-hours capture is one of the fastest ROI wins: answer, qualify, and book for next availability.",
  },
  {
    q: "How do you measure ROI?",
    a: "We estimate revenue recovered using your configured average booking value, plus outcomes like appointments booked, no-shows recovered, and reactivations — visible in your dashboard and digest emails.",
  },
  {
    q: "What if the AI gets something wrong?",
    a: "You can review transcripts/recordings, adjust scripts, and set approvals. We design for transparency, not mystery.",
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
            Questions, answered.
          </h2>
          <p className="mt-3 text-base max-w-xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            If you’re evaluating for your team, start with the demo — it shows the full flow in minutes.
          </p>
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
                    <p className="text-sm text-white/70 leading-relaxed">
                      {idx === 0 ? (
                        <>
                          An AI receptionist answers calls and takes messages.{" "}
                          <span>
                            Recall Touch answers calls AND runs automated recovery sequences until the revenue is recovered
                          </span>{" "}
                          — appointment booking, no-show recovery,{" "}
                          <Link href="/outbound" className="underline">
                            reactivation campaigns
                          </Link>
                          , quote chasing, and ROI proof in your dashboard. The follow-up is what pays for itself.
                        </>
                      ) : idx === 5 ? (
                        <>
                          Guardrails: per-contact limits, quiet hours, opt-outs, and reviewable actions.{" "}
                          <Link href="/security" className="underline">
                            Learn how security controls keep automation responsible
                          </Link>
                          . You can require approval before anything sends.
                        </>
                      ) : idx === 8 ? (
                        <>
                          We estimate revenue recovered using your configured average booking value, plus outcomes like appointments booked,
                          no-shows recovered, and reactivations — visible in your dashboard and digest emails.{" "}
                          For plan capacity and follow-up workload, see{" "}
                          <Link href="/pricing" className="underline">
                            pricing
                          </Link>
                          .
                        </>
                      ) : (
                        item.a
                      )}
                    </p>
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

