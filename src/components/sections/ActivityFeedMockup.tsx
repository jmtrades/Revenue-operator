"use client";

import { useMemo, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

const CARD_IDS = ["lead", "appointment", "emergency", "outbound", "info"] as const;
const ACCENTS = ["var(--card-lead)", "var(--card-appointment)", "var(--card-emergency)", "var(--card-outbound)", "var(--card-info)"] as const;

function FeedCard({ card, index }: { card: { label: string; time: string; name: string; meta: string; detail: string; accent: string }; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 1, y: 12 }}
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

const CARD_INTERVAL_MS = 3000;

export function ActivityFeedMockup() {
  const t = useTranslations("homepage.activityFeed");
  const [visibleCount, setVisibleCount] = useState(0);

  const feedCards = useMemo(
    () =>
      CARD_IDS.map((id, i) => ({
        label: t(`feedCards.${id}.label`),
        time: t(`feedCards.${id}.time`),
        name: t(`feedCards.${id}.name`),
        meta: t(`feedCards.${id}.meta`),
        detail: t(`feedCards.${id}.detail`),
        accent: ACCENTS[i],
      })),
    [t]
  );
  const chips = useMemo(() => [t("chips.all"), t("chips.needsAction"), t("chips.leads")], [t]);

  useEffect(() => {
    const t1 = setTimeout(() => setVisibleCount(1), 400);
    const t2 = setTimeout(() => setVisibleCount(2), 900);
    const t3 = setTimeout(() => setVisibleCount(3), 1400);
    const t4 = setTimeout(() => setVisibleCount(4), 1400 + CARD_INTERVAL_MS);
    const t5 = setTimeout(() => setVisibleCount(5), 1400 + CARD_INTERVAL_MS * 2);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  const displayCards = feedCards.slice(0, visibleCount);

  return (
    <div className="w-full max-w-[340px] mx-auto" aria-hidden="true">
      <div
        className="rounded-[28px] border-2 overflow-hidden shadow-2xl"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}
      >
        <div className="h-8 flex items-center justify-center border-b" style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--text-tertiary)" }} />
        </div>
        <div className="px-3 pt-4 pb-6" style={{ minHeight: "320px" }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Recall Touch</span>
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{t("dateLabel")}</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 scrollbar-hide">
            {chips.map((chip, idx) => (
              <span
                key={chip}
                className="px-2.5 py-1 rounded-full text-[10px] whitespace-nowrap"
                style={{
                  background: idx === 1 ? "var(--accent-primary-subtle)" : "var(--bg-elevated)",
                  color: idx === 1 ? "var(--accent-primary)" : "var(--text-secondary)",
                }}
              >
                {chip}
              </span>
            ))}
          </div>
          <div className="space-y-3 mt-3">
            <AnimatePresence mode="popLayout">
              {displayCards.map((card, i) => (
                <FeedCard key={`${card.label}-${card.time}-${i}`} card={card} index={i} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
