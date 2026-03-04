"use client";

import { useState, useEffect } from "react";

const CARDS = [
  { id: "1", type: "lead" as const, name: "Mike Johnson", time: "9:14 AM", summary: "Kitchen sink leak", outcome: "✅ Booked 10 AM" },
  { id: "2", type: "appointment" as const, name: "Sarah Chen", time: "9:31 AM", summary: "Dental cleaning — Dr. Martinez", outcome: "✅ Tue 9 AM" },
  { id: "3", type: "follow-up" as const, name: "James Wilson", time: "10:02 AM", summary: "Roof estimate — storm damage", outcome: "✅ Tomorrow 3 PM" },
];

const CARD_STYLES: Record<string, { border: string; badge: string }> = {
  lead: { border: "border-l-blue-500", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  appointment: { border: "border-l-green-500", badge: "bg-green-500/10 text-green-400 border-green-500/20" },
  "follow-up": { border: "border-l-purple-500", badge: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
};

const TYPE_LABELS: Record<string, string> = {
  lead: "Lead",
  appointment: "Appointment",
  "follow-up": "Follow-up",
};

export function HomepageActivityPreview() {
  const [visible, setVisible] = useState<number[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    CARDS.forEach((_, i) => {
      timers.push(setTimeout(() => setVisible((v) => [...v, i]), 400 + i * 600));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="w-full max-w-[900px] mx-auto rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-inset)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-glow-lg)",
      }}
      role="img"
      aria-label="Recall Touch activity preview: calls and leads"
    >
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}
      >
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/90" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/90" />
        </div>
        <span className="text-xs flex-1 text-center" style={{ color: "var(--text-tertiary)" }}>
          Recall Touch — Activity
        </span>
        <div className="w-12" />
      </div>
      <div className="p-4 sm:p-6" style={{ background: "var(--bg-primary)" }}>
        <h3 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Recent calls
        </h3>
        <ul className="space-y-3">
          {CARDS.map((card, i) => {
            const style = CARD_STYLES[card.type] ?? { border: "border-l-zinc-500", badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
            return (
              <li
                key={card.id}
                className={`rounded-xl border-l-[3px] overflow-hidden transition-all duration-300 bg-zinc-900/80 border border-zinc-800/50 ${style.border} ${
                  visible.includes(i) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
                }`}
                style={{
                  transitionDelay: visible.includes(i) ? `${i * 100}ms` : "0ms",
                }}
              >
                <div className="p-3 sm:p-4 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-zinc-500">{card.time}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${style.badge}`}>
                        {TYPE_LABELS[card.type]}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-1 truncate">{card.name}</p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{card.summary}</p>
                  </div>
                  <span className="text-xs text-green-400 shrink-0 font-medium">{card.outcome}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
