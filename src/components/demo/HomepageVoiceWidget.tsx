"use client";

import { useEffect, useState } from "react";

type Line = {
  speaker: "Caller" | "AI Agent";
  text: string;
  isAgent: boolean;
};

export function HomepageVoiceWidget() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const startDelay = setTimeout(() => setVisibleLines(1), 500);
    return () => clearTimeout(startDelay);
  }, []);

  useEffect(() => {
    if (visibleLines === 0 || visibleLines >= 6) return;
    const timer = setTimeout(() => setVisibleLines((prev) => prev + 1), 1400);
    return () => clearTimeout(timer);
  }, [visibleLines]);

  const lines: Line[] = [
    {
      speaker: "Caller",
      text: `"Hi, I'd like to schedule an appointment for Thursday."`,
      isAgent: false,
    },
    {
      speaker: "AI Agent",
      text: `"Of course! I have openings at 10 AM, 2 PM, and 4 PM. Which works best?"`,
      isAgent: true,
    },
    {
      speaker: "Caller",
      text: `"2 PM sounds perfect."`,
      isAgent: false,
    },
    {
      speaker: "AI Agent",
      text: `"Great — Thursday at 2 PM is booked. Can I get your name and number?"`,
      isAgent: true,
    },
    {
      speaker: "Caller",
      text: `"Sarah, 555-0142."`,
      isAgent: false,
    },
    {
      speaker: "AI Agent",
      text: `"All set, Sarah! You'll get a confirmation text shortly."`,
      isAgent: true,
    },
  ];

  return (
    <div className="bg-[var(--bg-card,#161B22)] border border-[var(--border-default,rgba(255,255,255,0.08))] rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" style={{ animation: "pulse 2s ease-in-out infinite" }} />
        <h3 className="text-base font-semibold text-white">See how your AI handles a call</h3>
      </div>
      <p className="text-sm text-white/60 mb-5">
        Real-time appointment booking — fully automated
      </p>

      <div className="space-y-3 min-h-[260px]">
        {lines.slice(0, visibleLines).map((line, i) => (
          <div
            key={i}
            className={`rounded-lg p-3 ${
              line.isAgent
                ? "bg-blue-500/[0.08] border border-blue-500/[0.15] ml-6"
                : "bg-white/[0.04] mr-6"
            }`}
          >
            <p
              className={`text-xs font-medium mb-0.5 ${
                line.isAgent ? "text-blue-400" : "text-white/35"
              }`}
            >
              {line.speaker}
            </p>
            <p className="text-sm text-white">{line.text}</p>
          </div>
        ))}

        {visibleLines > 0 && visibleLines < lines.length && (
          <div
            className={`rounded-lg p-3 ${
              visibleLines % 2 === 0
                ? "bg-white/[0.04] mr-6"
                : "bg-blue-500/[0.08] border border-blue-500/[0.15] ml-6"
            }`}
          >
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {visibleLines >= lines.length && (
        <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center gap-3">
          <a
            href="/sign-in?create=1"
            className="px-5 py-2.5 bg-white text-gray-900 font-semibold rounded-lg text-sm hover:bg-gray-100 transition-colors"
          >
            Build yours free →
          </a>
          <span className="text-xs text-white/35">
            No credit card · 14-day trial
          </span>
        </div>
      )}
    </div>
  );
}

