"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const FEED_ITEMS = [
  "Call booked",
  "Lead showed up",
  "Recovered lead scheduled",
  "Another conversation on the calendar",
];

function LiveFeed() {
  const [items, setItems] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (items.length >= 4) return;
    const next = FEED_ITEMS[items.length];
    const delay = items.length === 0 ? 800 : 2500 + items.length * 800;
    const t = setTimeout(() => setItems((prev) => [...prev, next]), delay);
    return () => clearTimeout(t);
  }, [items.length]);

  useEffect(() => {
    if (items.length < 4) return;
    const t = setTimeout(() => setItems([]), 8000);
    return () => clearTimeout(t);
  }, [items.length]);

  return (
    <div className="mt-8 w-full max-w-md">
      <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 text-left">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-stone-500">Your calendar</p>
          <span className="text-xs text-stone-500 tabular-nums">
            Running {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </span>
        </div>
        <div className="space-y-2 min-h-[88px]">
          {items.map((item, i) => (
            <p
              key={`${i}-${item}`}
              className="flex items-center gap-2 text-sm text-emerald-400"
            >
              <span className="text-emerald-500 shrink-0">✔</span> {item}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans">
      <section className="min-h-[90vh] flex flex-col items-center justify-center px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-50 text-center max-w-2xl">
          More real conversations on your calendar
        </h1>
        <p className="mt-4 text-lg text-stone-400 text-center max-w-xl">
          We reply, follow up, and revive so leads show up. You watch your calendar change.
        </p>
        <Link
          href="/activate"
          className="mt-8 px-8 py-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-stone-950 transition-colors"
        >
          See it work
        </Link>
        <p className="mt-3 text-stone-500 text-sm">No payment until you choose to continue · See your calendar fill from day one</p>
        <div className="mt-4 px-4 py-3 rounded-xl bg-stone-800/60 border border-stone-700 text-center">
          <p className="text-stone-400 text-sm">Connect today → <span className="text-emerald-400 font-medium">~3–6 more conversations per week</span> projected</p>
        </div>

        <div className="mt-8 w-full max-w-lg p-4 rounded-xl bg-stone-900/60 border border-stone-800">
          <p className="text-sm font-medium text-stone-400 mb-3">Operating rules — protects your reputation</p>
          <ul className="space-y-2 text-sm text-stone-500">
            <li>• Stops when interest drops</li>
            <li>• Avoids repeated messages</li>
            <li>• Slows after sensitive discussions</li>
            <li>• Pauses when uncertain</li>
          </ul>
          <p className="text-sm text-stone-400 mt-3 pt-3 border-t border-stone-800">
            You can intervene anytime. After connecting, you only need to take calls. First week: behaves conservatively while learning. Prioritizes qualified conversations, not volume.
          </p>
        </div>

        <LiveFeed />
      </section>

      <section className="py-16 px-6 border-t border-stone-800">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-10">What changes</h2>
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-red-950/20 border border-red-900/50">
            <p className="text-sm font-medium text-red-300 mb-4">Without us</p>
            <ul className="space-y-2 text-stone-400">
              <li>• Empty slots</li>
              <li>• No-shows</li>
              <li>• Ghosted leads</li>
              <li>• &quot;I&apos;ll think about it&quot;</li>
              <li>• Fewer real conversations</li>
            </ul>
          </div>
          <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-900/50">
            <p className="text-sm font-medium text-emerald-300 mb-4">With us</p>
            <ul className="space-y-2 text-stone-300">
              <li>• More calls booked</li>
              <li>• Fewer no-shows</li>
              <li>• Cold leads back on your calendar</li>
              <li>• Leads actually show up</li>
              <li>• More real conversations</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-stone-800">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-10">How it works</h2>
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex gap-4 items-start">
            <span className="w-8 h-8 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-medium shrink-0">1</span>
            <p className="text-stone-300">Lead expresses interest</p>
          </div>
          <div className="flex gap-4 items-start">
            <span className="w-8 h-8 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-medium shrink-0">2</span>
            <p className="text-stone-300">We reply, follow up, revive—so they get to the calendar</p>
          </div>
          <div className="flex gap-4 items-start">
            <span className="w-8 h-8 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-medium shrink-0">3</span>
            <p className="text-stone-300">More calls get booked and attended</p>
          </div>
          <div className="flex gap-4 items-start">
            <span className="w-8 h-8 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-medium shrink-0">4</span>
            <p className="text-stone-300">You watch your calendar fill with real conversations</p>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-stone-800 bg-stone-900/30">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-4">14 days to see your calendar change</h2>
        <p className="text-stone-400 text-center max-w-xl mx-auto mb-2">
          More calls booked. Fewer empty slots. We handle the outreach so leads show up.
        </p>
        <p className="text-stone-500 text-sm text-center max-w-lg mx-auto mb-8">
          Built-in operating rules protect your reputation. First week runs in cautious mode.
        </p>
        <div className="text-center">
          <Link
            href="/activate"
            className="inline-block px-8 py-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-stone-950"
          >
            See it work
          </Link>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-stone-800">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-4">Pricing</h2>
        <p className="text-stone-400 text-center max-w-lg mx-auto mb-8 text-sm">Responsibility coverage: we assume pipeline continuity. You choose the level.</p>
        <div className="max-w-3xl mx-auto grid sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-stone-900/60 border border-stone-800">
            <p className="font-medium text-stone-200">Starter</p>
            <p className="text-2xl font-semibold text-stone-50 mt-1">£299<span className="text-base font-normal text-stone-500">/mo</span></p>
            <p className="text-emerald-400 text-sm mt-2">Continuity coverage up to ~£15k throughput</p>
          </div>
          <div className="p-6 rounded-xl bg-stone-900/60 border border-stone-800">
            <p className="font-medium text-stone-200">Growth</p>
            <p className="text-2xl font-semibold text-stone-50 mt-1">£799<span className="text-base font-normal text-stone-500">/mo</span></p>
            <p className="text-emerald-400 text-sm mt-2">Continuity coverage up to ~£45k throughput</p>
          </div>
          <div className="p-6 rounded-xl bg-stone-900/60 border border-stone-800">
            <p className="font-medium text-stone-200">Scale</p>
            <p className="text-2xl font-semibold text-stone-50 mt-1">£1,999<span className="text-base font-normal text-stone-500">/mo</span></p>
            <p className="text-emerald-400 text-sm mt-2">Continuity coverage up to ~£120k throughput</p>
          </div>
        </div>

        <div className="mt-12 max-w-2xl mx-auto p-6 rounded-xl bg-stone-900/60 border border-stone-800">
          <h3 className="text-sm font-medium text-stone-400 mb-4">Operational guarantees</h3>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-stone-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 shrink-0">✓</span>
              Will not message uninterested leads
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 shrink-0">✓</span>
              Will not send outside configured hours
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 shrink-0">✓</span>
              Stops after negative sentiment
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 shrink-0">✓</span>
              Escalates sensitive conversations
            </li>
          </ul>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-stone-800">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-8">Common questions</h2>
        <div className="max-w-xl mx-auto space-y-6">
          <div>
            <p className="font-medium text-stone-200">Can it harm my reputation?</p>
            <p className="text-stone-400 text-sm mt-1">Operating rules: stops when interest drops, avoids repeated messages, slows after sensitive discussions, pauses when uncertain. Prioritizes qualified conversations, not volume.</p>
          </div>
          <div>
            <p className="font-medium text-stone-200">Can I take control?</p>
            <p className="text-stone-400 text-sm mt-1">You can intervene anytime. Pause, override, or step in.</p>
          </div>
          <div>
            <p className="font-medium text-stone-200">What about the first week?</p>
            <p className="text-stone-400 text-sm mt-1">Behaves conservatively while learning your pipeline. Ramps up as confidence grows.</p>
          </div>
          <div>
            <p className="font-medium text-stone-200">Can I see what&apos;s happening?</p>
            <p className="text-stone-400 text-sm mt-1">Every booking and outcome is visible.</p>
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-stone-800 text-center">
        <p className="text-stone-500 text-sm">Revenue Operator</p>
        <p className="text-stone-600 text-xs mt-1">Pipeline continuity infrastructure</p>
      </footer>
    </div>
  );
}
