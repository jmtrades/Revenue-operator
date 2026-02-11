"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const LIVE_FEED_ITEMS = [
  "Followed up with John after 6 hours",
  "Booked call with Sarah",
  "Recovered ghosted lead after 2 days",
];

function LiveFeed() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % LIVE_FEED_ITEMS.length), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mt-8 p-4 rounded-xl bg-stone-900/60 border border-stone-800 text-left max-w-md">
      <p className="text-xs text-stone-500 mb-2">Live activity</p>
      {LIVE_FEED_ITEMS.map((item, i) => (
        <p
          key={i}
          className={`flex items-center gap-2 text-sm transition-opacity ${i === active ? "text-emerald-400 opacity-100" : "text-stone-500 opacity-60"}`}
        >
          <span className="text-emerald-500">✔</span> {item}
        </p>
      ))}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans">
      <section className="min-h-[90vh] flex flex-col items-center justify-center px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-50 text-center max-w-2xl">
          You&apos;re losing leads every day. This fixes it automatically.
        </h1>
        <p className="mt-4 text-lg text-stone-400 text-center max-w-xl">
          It replies, follows up, and revives prospects until they book.
        </p>
        <Link
          href="/dashboard/onboarding"
          className="mt-8 px-8 py-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-stone-950 transition-colors"
        >
          Start free 14-day trial
        </Link>
        <p className="mt-3 text-stone-500 text-sm">No setup · No credit card · Live in 60 seconds</p>
        <LiveFeed />
      </section>

      <section className="py-16 px-6 border-t border-stone-800">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-10">What happens to most leads</h2>
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-red-950/20 border border-red-900/50">
            <p className="text-sm font-medium text-red-300 mb-4">Without operator</p>
            <ul className="space-y-2 text-stone-400">
              <li>• Replies late</li>
              <li>• &quot;I&apos;ll think about it&quot;</li>
              <li>• No response</li>
              <li>• No-shows</li>
              <li>• Lost revenue</li>
            </ul>
          </div>
          <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-900/50">
            <p className="text-sm font-medium text-emerald-300 mb-4">With operator</p>
            <ul className="space-y-2 text-stone-300">
              <li>• Replies instantly</li>
              <li>• Persistent follow-up</li>
              <li>• Handles hesitation</li>
              <li>• Reduces no-shows</li>
              <li>• Books calls</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-stone-800">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-10">How it works</h2>
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex gap-4 items-start">
            <span className="w-8 h-8 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-medium shrink-0">1</span>
            <p className="text-stone-300">Lead messages you</p>
          </div>
          <div className="flex gap-4 items-start">
            <span className="w-8 h-8 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-medium shrink-0">2</span>
            <p className="text-stone-300">Operator responds</p>
          </div>
          <div className="flex gap-4 items-start">
            <span className="w-8 h-8 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-medium shrink-0">3</span>
            <p className="text-stone-300">It follows up automatically</p>
          </div>
          <div className="flex gap-4 items-start">
            <span className="w-8 h-8 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-medium shrink-0">4</span>
            <p className="text-stone-300">They book or decline</p>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-stone-800 bg-stone-900/30">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-4">Try it on real leads for 14 days</h2>
        <p className="text-stone-400 text-center max-w-xl mx-auto mb-8">
          You will see conversations it saves before paying anything.
        </p>
        <div className="text-center">
          <Link
            href="/dashboard/onboarding"
            className="inline-block px-8 py-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-stone-950"
          >
            Start free 14-day trial
          </Link>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-stone-800">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-8">Pricing</h2>
        <div className="max-w-3xl mx-auto grid sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-stone-900/60 border border-stone-800">
            <p className="font-medium text-stone-200">Starter</p>
            <p className="text-2xl font-semibold text-stone-50 mt-1">£299<span className="text-base font-normal text-stone-500">/mo</span></p>
            <p className="text-emerald-400 text-sm mt-2">14-day free trial</p>
          </div>
          <div className="p-6 rounded-xl bg-stone-900/60 border border-stone-800">
            <p className="font-medium text-stone-200">Growth</p>
            <p className="text-2xl font-semibold text-stone-50 mt-1">£799<span className="text-base font-normal text-stone-500">/mo</span></p>
            <p className="text-emerald-400 text-sm mt-2">14-day free trial</p>
          </div>
          <div className="p-6 rounded-xl bg-stone-900/60 border border-stone-800">
            <p className="font-medium text-stone-200">Scale</p>
            <p className="text-2xl font-semibold text-stone-50 mt-1">£1,999<span className="text-base font-normal text-stone-500">/mo</span></p>
            <p className="text-emerald-400 text-sm mt-2">14-day free trial</p>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 border-t border-stone-800">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-8">Common questions</h2>
        <div className="max-w-xl mx-auto space-y-6">
          <div>
            <p className="font-medium text-stone-200">Will it sound robotic?</p>
            <p className="text-stone-400 text-sm mt-1">Messages adapt to the conversation.</p>
          </div>
          <div>
            <p className="font-medium text-stone-200">Will it annoy leads?</p>
            <p className="text-stone-400 text-sm mt-1">It stops automatically when interest drops.</p>
          </div>
          <div>
            <p className="font-medium text-stone-200">Can I control it?</p>
            <p className="text-stone-400 text-sm mt-1">You can pause anytime.</p>
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-stone-800 text-center text-stone-500 text-sm">
        Revenue Operator
      </footer>
    </div>
  );
}
