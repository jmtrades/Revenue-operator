"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const LIVE_FEED_ITEMS = [
  "Conversation detected",
  "Response prepared",
  "Follow-up scheduled",
  "Call booked",
  "Attendance confirmed",
];

function LiveFeedAnimation() {
  const [visibleItems, setVisibleItems] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Show items one by one, then loop
    const interval = setInterval(() => {
      setCurrentIndex((i) => {
        const next = (i + 1) % LIVE_FEED_ITEMS.length;
        setVisibleItems((prev) => {
          if (next === 0) return [LIVE_FEED_ITEMS[0]!]; // Reset to first item
          return [...LIVE_FEED_ITEMS.slice(0, next + 1)];
        });
        return next;
      });
    }, 2500); // Every 2.5 seconds
    return () => clearInterval(interval);
  }, []);

  // Initialize with first item
  useEffect(() => {
    if (visibleItems.length === 0) {
      setVisibleItems([LIVE_FEED_ITEMS[0]!]);
    }
  }, [visibleItems.length]);

  return (
    <div className="mt-10 w-full max-w-sm mx-auto p-5 rounded-xl border border-stone-700 bg-stone-900/50 text-left">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs text-stone-500">Running</span>
      </div>
      <div className="space-y-2 min-h-[120px]">
        {visibleItems.map((item, i) => (
          <p key={`${item}-${i}`} className="flex items-center gap-2 text-sm text-emerald-400">
            <span className="text-emerald-500 shrink-0">✔</span> {item}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans">
      <section className="min-h-[85vh] flex flex-col items-center justify-center px-6 py-14">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-50 text-center max-w-2xl">
          More real conversations land on your calendar
        </h1>
        <p className="mt-4 text-lg text-stone-400 text-center max-w-xl leading-relaxed">
          We maintain continuity — reply, follow up, recover — so people show up. You take the calls.
        </p>
        <Link
          href="/activate"
          className="mt-8 px-8 py-3.5 rounded-lg font-medium text-stone-950 transition-opacity hover:opacity-90"
          style={{ background: "var(--meaning-green)" }}
        >
          Start 14-day protection
        </Link>
        <p className="mt-3 text-stone-500 text-sm text-center">
          $0 today · Nothing to configure · Takes ~10 seconds
        </p>
        <div className="mt-6 max-w-md mx-auto px-4 py-3 rounded-lg border border-stone-800 bg-stone-900/30">
          <p className="text-xs text-stone-400 text-center leading-relaxed">
            We never send pushy messages<br />
            We don&apos;t replace your conversations<br />
            We only keep them from going quiet
          </p>
        </div>
        <LiveFeedAnimation />
      </section>

      <section className="py-14 px-6 border-t border-stone-800">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-8">Most leads don&apos;t say no — they disappear</h2>
        <p className="text-stone-400 text-center max-w-2xl mx-auto leading-relaxed">
          Once they go quiet, they rarely come back. We keep the conversation going so more of them reach your calendar instead of fading away.
        </p>
      </section>

      <section className="py-14 px-6 border-t border-stone-800 bg-stone-900/20">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-8">Once connected, conversations don&apos;t drop</h2>
        <p className="text-stone-400 text-center max-w-2xl mx-auto leading-relaxed">
          We maintain continuity—replies, follow-ups, recoveries—so people show up. You don&apos;t manage the thread; you take the call when it&apos;s time.
        </p>
      </section>

      <section className="py-14 px-6 border-t border-stone-800">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-8">It won&apos;t annoy your leads</h2>
        <p className="text-stone-400 text-center max-w-2xl mx-auto leading-relaxed">
          Short, neutral messages. No pressure. No repeated pestering. We stop when interest drops and slow down when it&apos;s sensitive.
        </p>
      </section>

      <section className="py-14 px-6 border-t border-stone-800 bg-stone-900/20">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-8">You&apos;ll see it working today</h2>
        <p className="text-stone-400 text-center max-w-2xl mx-auto leading-relaxed">
          Connect once. Within minutes you&apos;ll see conversations being maintained and calls being protected. No long setup.
        </p>
      </section>

      <section className="py-14 px-6 border-t border-stone-800">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-6">Coverage pricing</h2>
        <p className="text-stone-400 text-center max-w-lg mx-auto mb-10 text-sm">
          Continuity by conversation volume. Trial is full protection—no feature limits.
        </p>
        <div className="max-w-3xl mx-auto grid sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-stone-900/60 border border-stone-800 text-center">
            <p className="font-medium text-stone-200">Starter</p>
            <p className="text-2xl font-semibold text-stone-50 mt-1">$299<span className="text-base font-normal text-stone-500">/mo</span></p>
            <p className="text-stone-400 text-sm mt-2">Low volume</p>
          </div>
          <div className="p-6 rounded-xl bg-stone-900/60 border border-stone-800 text-center">
            <p className="font-medium text-stone-200">Growth</p>
            <p className="text-2xl font-semibold text-stone-50 mt-1">$799<span className="text-base font-normal text-stone-500">/mo</span></p>
            <p className="text-stone-400 text-sm mt-2">Consistent inbound</p>
          </div>
          <div className="p-6 rounded-xl bg-stone-900/60 border border-stone-800 text-center">
            <p className="font-medium text-stone-200">Scale</p>
            <p className="text-2xl font-semibold text-stone-50 mt-1">$1,999<span className="text-base font-normal text-stone-500">/mo</span></p>
            <p className="text-stone-400 text-sm mt-2">High inbound</p>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-stone-800 bg-stone-900/30">
        <p className="text-stone-300 text-center max-w-xl mx-auto mb-8">
          More real conversations on your calendar. We maintain; you take the calls.
        </p>
        <div className="text-center">
          <Link
            href="/activate"
            className="inline-block px-8 py-3.5 rounded-lg font-medium text-stone-950 transition-opacity hover:opacity-90"
            style={{ background: "var(--meaning-green)" }}
          >
            Start 14-day protection
          </Link>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-stone-800 text-center">
        <p className="text-stone-500 text-sm">Revenue continuity. You take the calls.</p>
      </footer>
    </div>
  );
}
