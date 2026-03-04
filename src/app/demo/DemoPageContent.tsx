"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LiveAgentChat } from "@/components/LiveAgentChat";
import { ROUTES } from "@/lib/constants";

const DEMO_GREETING =
  "Hi! This is the Recall Touch demo. I can help with scheduling, pricing, callbacks, or anything else. What do you need?";

const SCENARIOS = [
  "Schedule an appointment",
  "Ask about pricing",
  "After-hours call",
  "Request a callback",
  "Get a quote",
];

export function DemoPageContent() {
  const chatRef = useRef<{ send: (text: string) => void } | null>(null);
  const [messageCount, setMessageCount] = useState(0);

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 text-center mb-8">
        <h1 className="font-bold text-3xl md:text-4xl mb-2" style={{ letterSpacing: "-0.02em" }}>
          Experience Recall Touch
        </h1>
        <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Talk to an AI agent that handles real calls. Right now.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-[1fr_1.2fr] gap-6 md:gap-8 items-start">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col items-center gap-4">
          <div className="w-32 h-56 rounded-3xl border-2 border-zinc-700 bg-zinc-900 flex flex-col items-center justify-center gap-3 p-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl" aria-hidden>🎙</div>
            <p className="text-[10px] text-zinc-500 text-center">Tap mic below to talk</p>
          </div>
          <p className="text-xs text-zinc-500 text-center">Or try a scenario:</p>
          <div className="flex flex-wrap justify-center gap-2 w-full">
            {SCENARIOS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => chatRef.current?.send(label)}
                className="rounded-full border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Live transcript</span>
          </div>
          <LiveAgentChat
            ref={chatRef}
            variant="demo"
            initialAgent="sarah"
            showMic
            greeting={DEMO_GREETING}
            onUserMessage={() => setMessageCount((c) => c + 1)}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        <p className="text-xs font-semibold uppercase text-zinc-500 mb-2">Voice style</p>
        <p className="text-sm text-zinc-400 mb-4">Choose Professional, Friendly, or Concise in the chat header above.</p>
      </div>

      {messageCount >= 3 && (
        <div className="max-w-5xl mx-auto px-4 mt-8 rounded-2xl border border-zinc-700 bg-zinc-900/80 p-6">
          <h3 className="font-semibold text-white mb-3">What just happened</h3>
          <p className="text-sm text-zinc-400 mb-2">The agent captured the conversation and would:</p>
          <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside mb-4">
            <li>Extract name, request type, and next step</li>
            <li>Queue a callback or appointment if needed</li>
            <li>Send you a summary and follow-up</li>
          </ul>
          <Link
            href={ROUTES.START}
            className="inline-flex items-center justify-center rounded-xl bg-white text-black font-semibold px-5 py-2.5 text-sm hover:bg-zinc-100"
          >
            Set this up →
          </Link>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 mt-8 text-center">
        <p className="text-sm text-zinc-500 mb-2">Voice: click the round widget in the corner to talk.</p>
        <Link href={ROUTES.START} className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
          Get this for your number →
        </Link>
      </div>
    </>
  );
}
