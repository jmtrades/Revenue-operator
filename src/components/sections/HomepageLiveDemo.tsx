"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";

const USE_CASES = [
  { id: "missed-call", label: "Missed call recovery", caller: "Hi, I called earlier and nobody answered. I need to schedule a visit.", agent: "Thanks for calling back. I’ll get you on the calendar — what day works best?", result: "Callback captured · Appointment offered" },
  { id: "booking", label: "Appointment booking", caller: "I’d like to book an appointment for next week.", agent: "Sure. We have Tuesday afternoon or Wednesday morning. Which do you prefer?", result: "Slot confirmed · Reminder scheduled" },
  { id: "lead-follow-up", label: "Lead follow-up", caller: "I filled out the form on your site. Wanted to know more about pricing.", agent: "I’ve got your details. Our team will reach out within an hour. What’s the best number?", result: "Lead qualified · Follow-up queued" },
  { id: "after-hours", label: "After-hours handling", caller: "It’s 8pm — are you open? I have an urgent question.", agent: "We’re closed now, but I can take your name and number and have someone call you first thing tomorrow.", result: "Message taken · Next-day callback" },
  { id: "screening", label: "Call screening", caller: "I need to speak with the person in charge of billing.", agent: "I can help with billing. Can you tell me your account name or number so I get you to the right person?", result: "Intent captured · Routed to right team" },
] as const;

export function HomepageLiveDemo() {
  const [activeId, setActiveId] = useState<(typeof USE_CASES)[number]["id"]>("missed-call");
  const active = USE_CASES.find((u) => u.id === activeId) ?? USE_CASES[0];

  return (
    <section
      id="live-audio-demo"
      className="py-16 md:py-20 border-t border-zinc-800/60"
      style={{ background: "#020617" }}
    >
      <Container>
        <div className="flex flex-col gap-6 md:gap-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-semibold text-white">
              Hear the difference in 30 seconds
            </h2>
            <p className="mt-2 text-sm md:text-base text-zinc-400">
              See how your AI handles real situations — missed calls, booking, follow-up, after-hours, and screening.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {USE_CASES.map((u) => {
              const isActive = u.id === activeId;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setActiveId(u.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm border transition-colors ${
                    isActive
                      ? "bg-white text-black border-white"
                      : "border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500"
                  }`}
                >
                  {u.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 md:p-6">
            <p className="text-xs font-semibold uppercase text-zinc-500 mb-3">{active.label}</p>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl px-3 py-2 bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Caller</p>
                <p>{active.caller}</p>
              </div>
              <div className="rounded-xl px-3 py-2 bg-zinc-800/80 border border-emerald-900/50 text-emerald-100 ml-4">
                <p className="text-[11px] uppercase tracking-wide text-emerald-400/80 mb-1">Your AI</p>
                <p>{active.agent}</p>
              </div>
              <div className="rounded-xl px-3 py-2 bg-zinc-800/50 border border-dashed border-zinc-600 text-zinc-400">
                <p className="text-[11px] uppercase tracking-wide mb-1">Result</p>
                <p>{active.result}</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-4">
              Sample conversation — your AI handles this 24/7 for any type of business.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
            <p className="text-sm text-zinc-400">
              Ready to make this your phone line?
            </p>
            <a
              href="/activate"
              className="bg-white text-black font-semibold rounded-xl px-5 py-2.5 text-sm hover:bg-zinc-100 transition-colors"
            >
              Start free →
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
