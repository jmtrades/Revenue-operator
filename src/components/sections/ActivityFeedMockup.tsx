"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FEED_CARDS = [
  { type: "lead" as const, label: "NEW LEAD", time: "10:32 AM", name: "Sarah Mitchell", meta: "Kitchen remodel quote", detail: "Budget: $15–20K · Lead score: 85", accent: "var(--card-lead)" },
  { type: "appointment" as const, label: "APPOINTMENT BOOKED", time: "9:47 AM", name: "James Cooper", meta: "AC maintenance — Tue Mar 3, 2:00 PM", detail: "Confirmation text sent ✓", accent: "var(--card-appointment)" },
  { type: "emergency" as const, label: "URGENT", time: "9:15 AM", name: "Maria Santos", meta: "Water heater leaking", detail: "You were alerted via text + call", accent: "var(--card-emergency)" },
  { type: "outbound" as const, label: "FOLLOW-UP CALL", time: "8:30 AM", name: "AI called David Kim", meta: "Appointment reminder", detail: "Confirmed for tomorrow ✓", accent: "var(--card-outbound)" },
  { type: "info" as const, label: "HANDLED", time: "7:45 AM", name: "Mike Johnson", meta: "Asked about business hours", detail: "AI answered: Mon–Fri 8am–6pm", accent: "var(--card-info)" },
];

function FeedCard({ card, index }: { card: (typeof FEED_CARDS)[0]; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.15 }}
      className="rounded-xl border-l-4 p-4 text-left"
      style={{
        background: "var(--bg-elevated)",
        borderColor: card.accent,
        borderLeftWidth: "3px",
      }}
    >
      <div className="flex justify-between items-start gap-2 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: card.accent }}>
          {card.label}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{card.time}</span>
      </div>
      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{card.name}</p>
      <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>{card.meta}</p>
      <p className="text-[10px] mt-1.5 truncate" style={{ color: "var(--text-tertiary)" }}>{card.detail}</p>
    </motion.div>
  );
}

export function ActivityFeedMockup() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setVisibleCount(1), 400);
    const t2 = setTimeout(() => setVisibleCount(2), 900);
    const t3 = setTimeout(() => setVisibleCount(3), 1400);
    const t4 = setTimeout(() => setVisibleCount(4), 1900);
    const t5 = setTimeout(() => setVisibleCount(5), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  return (
    <div className="w-full max-w-[340px] mx-auto" aria-hidden="true">
      <div
        className="rounded-[28px] border-2 overflow-hidden shadow-2xl"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}
      >
        <div className="h-8 flex items-center justify-center border-b" style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--text-tertiary)" }} />
        </div>
        <div className="px-3 pt-4 pb-6" style={{ minHeight: "320px" }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Recall Touch</span>
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Today</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 scrollbar-hide">
            {["All", "Needs action", "Leads"].map((chip) => (
              <span
                key={chip}
                className="px-2.5 py-1 rounded-full text-[10px] whitespace-nowrap"
                style={{
                  background: chip === "Needs action" ? "var(--accent-primary-subtle)" : "var(--bg-elevated)",
                  color: chip === "Needs action" ? "var(--accent-primary)" : "var(--text-secondary)",
                }}
              >
                {chip}
              </span>
            ))}
          </div>
          <div className="space-y-3 mt-3">
            <AnimatePresence mode="popLayout">
              {FEED_CARDS.slice(0, visibleCount).map((card, i) => (
                <FeedCard key={`${card.label}-${card.time}`} card={card} index={i} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
