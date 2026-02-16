"use client";

import Link from "next/link";

// Static assurance only — no motion for reassurance (responsibility ownership)
function StabilityAssurance() {
  return (
    <div className="mt-10 w-full max-w-sm mx-auto p-5 rounded-xl border border-stone-700 bg-stone-900/50 text-left">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
        <span className="text-xs text-stone-500">Stable</span>
      </div>
      <p className="text-sm text-stone-400">Nothing requires supervision. Decision completion continues here. You handle: calls.</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans">
      <section className="min-h-[85vh] flex flex-col items-center justify-center px-6 py-14">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-50 text-center max-w-2xl">
          Revenue doesn’t silently disappear
        </h1>
        <p className="mt-4 text-lg text-stone-400 text-center max-w-xl leading-relaxed">
          Decision completion continues here so customers complete actions and show up. You handle: calls.
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
            No campaigns · No persuasion<br />
            We prevent drop-off and protect attendance<br />
            So revenue stays stable
          </p>
        </div>
        <StabilityAssurance />
      </section>

      <section className="py-14 px-6 border-t border-stone-800">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-8">Most revenue is lost to drop-off, not no</h2>
        <p className="text-stone-400 text-center max-w-2xl mx-auto leading-relaxed">
          When follow-through stops, decisions don’t complete. We prevent that — so more customers reach your calendar instead of fading away.
        </p>
      </section>

      <section className="py-14 px-6 border-t border-stone-800 bg-stone-900/20">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-8">In place, follow-through continues here</h2>
        <p className="text-stone-400 text-center max-w-2xl mx-auto leading-relaxed">
          Decision completion and attendance continue here. Customers complete actions. You handle the call.
        </p>
      </section>

      <section className="py-14 px-6 border-t border-stone-800">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-8">It won&apos;t annoy your leads</h2>
        <p className="text-stone-400 text-center max-w-2xl mx-auto leading-relaxed">
          Short, neutral messages. No pressure. No repeated pestering. Restraint remains; pace stays calm.
        </p>
      </section>

      <section className="py-14 px-6 border-t border-stone-800 bg-stone-900/20">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-8">You’ll see stability from day one</h2>
        <p className="text-stone-400 text-center max-w-2xl mx-auto leading-relaxed">
          Connect. Follow-through continues. No manual follow-through required. No long setup.
        </p>
      </section>

      <section className="py-14 px-6 border-t border-stone-800">
        <h2 className="text-xl font-semibold text-stone-50 text-center mb-6">Coverage pricing</h2>
        <p className="text-stone-400 text-center max-w-lg mx-auto mb-10 text-sm">
          Stability by volume. Trial is full protection—no feature limits.
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
          More completed actions on your calendar. Follow-through continues here. You handle: calls.
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
        <p className="text-stone-500 text-sm">Revenue continuity. You handle: calls.</p>
      </footer>
    </div>
  );
}
