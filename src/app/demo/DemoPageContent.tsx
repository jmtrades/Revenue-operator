"use client";

import Link from "next/link";
import { LiveAgentChat } from "@/components/LiveAgentChat";
import { ROUTES } from "@/lib/constants";

const DEMO_GREETING =
  "Hi! This is the Recall Touch demo. I can be your receptionist for any kind of business — just tell me what you need. What can I help you with?";

export function DemoPageContent() {
  return (
    <>
      <div className="max-w-2xl mx-auto px-4 text-center mb-8">
        <h1 className="font-bold text-3xl md:text-4xl mb-2" style={{ letterSpacing: "-0.02em" }}>
          Talk to your AI. Right now.
        </h1>
        <p className="text-base mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          This is the same AI that handles real calls. Try it.
        </p>
        <p className="text-sm text-zinc-500 mb-6">
          Voice: click the round widget in the corner. Text: use the chat below.
        </p>
      </div>
      <div className="max-w-2xl mx-auto px-4 mb-10">
        <div className="rounded-2xl border-2 border-zinc-600 bg-zinc-900/80 p-4 text-center">
          <p className="text-xs font-semibold uppercase text-zinc-500 mb-2">Voice — try first</p>
          <p className="text-sm text-zinc-300">Click the round widget in the bottom-right corner to start talking. No install required.</p>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4">
        <p className="text-xs font-semibold uppercase text-zinc-500 mb-2">Or type here</p>
        <LiveAgentChat
          variant="demo"
          initialAgent="sarah"
          showMic
          greeting={DEMO_GREETING}
        />
      </div>
      <div className="max-w-2xl mx-auto px-4 mt-8 text-center">
        <Link href={ROUTES.START} className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
          Get this for your number →
        </Link>
      </div>
    </>
  );
}
