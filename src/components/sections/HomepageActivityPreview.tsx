"use client";

import { useState, useEffect } from "react";

const CARDS = [
  { id: "1", type: "lead" as const, name: "Mike Johnson", time: "9:14 AM", duration: "4:32", summary: "Kitchen sink leak — 742 Elm St — Booked tomorrow 10 AM", score: 92 },
  { id: "2", type: "appointment" as const, name: "Sarah Chen", time: "9:31 AM", duration: "2:15", summary: "Dental cleaning — Tuesday 9 AM Dr. Martinez", score: null },
  { id: "3", type: "follow-up" as const, name: "James Wilson", time: "10:02 AM", duration: "3:05", summary: "Roof estimate — Storm damage — Tomorrow 3 PM", score: null },
  { id: "4", type: "urgent" as const, name: "Emergency", time: "10:17 AM", duration: "1:52", summary: "Pipe burst — 88 Oak Ave — Owner notified immediately", score: null },
  { id: "5", type: "lead" as const, name: "Lisa Park", time: "10:44 AM", duration: "2:38", summary: "AC repair quote — Scheduled callback 2 PM", score: null },
];

const TYPE_COLORS: Record<string, string> = {
  lead: "#3B82F6",
  appointment: "#22C55E",
  "follow-up": "#A855F7",
  urgent: "#EF4444",
};

const TYPE_LABELS: Record<string, string> = {
  lead: "Lead",
  appointment: "Appointment",
  "follow-up": "Follow-up",
  urgent: "Urgent",
};

export function HomepageActivityPreview() {
  const [visible, setVisible] = useState<number[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    CARDS.forEach((_, i) => {
      timers.push(setTimeout(() => setVisible((v) => [...v, i]), 200 + i * 150));
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
          {CARDS.map((card, i) => (
            <li
              key={card.id}
              className="rounded-xl border-l-4 overflow-hidden transition-all duration-300"
              style={{
                borderLeftColor: TYPE_COLORS[card.type] ?? "#71717a",
                background: "var(--bg-surface)",
                opacity: visible.includes(i) ? 1 : 0,
                transform: visible.includes(i) ? "translateX(0)" : "translateX(-12px)",
              }}
            >
              <div className="p-3 sm:p-4">
                <div className="flex justify-between items-start gap-2">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TYPE_COLORS[card.type] ?? "#71717a" }}
                  >
                    {TYPE_LABELS[card.type]}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{card.time}</span>
                </div>
                <p className="text-sm font-medium mt-1 truncate" style={{ color: "var(--text-primary)" }}>{card.name}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>{card.summary}</p>
                {card.score != null && (
                  <p className="text-[10px] mt-1.5" style={{ color: "var(--text-tertiary)" }}>Score: {card.score}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
