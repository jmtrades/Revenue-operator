"use client";

import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";

interface LeadScoreCardProps {
  score: number;
  tags: string[];
  nextAction: string;
}

const tagColorMap: Record<string, { bg: string; text: string; border: string }> = {
  "Returning caller": {
    bg: "var(--bg-success-faint)",
    text: "var(--status-green)",
    border: "var(--status-green)",
  },
  "Previous no-show": {
    bg: "var(--bg-warning-faint)",
    text: "var(--status-amber)",
    border: "var(--status-amber)",
  },
  "Stale — needs attention": {
    bg: "var(--bg-warning-faint)",
    text: "var(--status-amber)",
    border: "var(--status-amber)",
  },
  "At risk": {
    bg: "var(--bg-error-faint)",
    text: "var(--status-red)",
    border: "var(--status-red)",
  },
  "High intent": {
    bg: "var(--bg-success-faint)",
    text: "var(--status-green)",
    border: "var(--status-green)",
  },
  Engaged: {
    bg: "var(--bg-blue-faint)",
    text: "var(--status-blue)",
    border: "var(--status-blue)",
  },
};

function getScoreColor(score: number): { ring: string; label: string } {
  if (score <= 30) {
    return { ring: "var(--status-red)", label: "Cold" };
  }
  if (score <= 60) {
    return { ring: "var(--status-amber)", label: "Warm" };
  }
  return { ring: "var(--status-green)", label: "Hot" };
}

export function LeadScoreCard({
  score,
  tags,
  nextAction,
}: LeadScoreCardProps) {
  const { ring, label } = getScoreColor(score);
  const displayScore = Math.min(Math.max(score, 0), 100);

  return (
    <motion.div
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Circular Score Indicator */}
      <div className="flex flex-col items-center mb-5">
        <div className="relative mb-3">
          {/* Background circle */}
          <svg
            className="h-24 w-24"
            viewBox="0 0 100 100"
            style={{ transform: "rotate(-90deg)" }}
          >
            {/* Static background ring */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--bg-input)"
              strokeWidth="8"
            />
            {/* Animated progress ring */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              stroke={ring}
              strokeDasharray={2 * Math.PI * 45}
              initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
              animate={{
                strokeDashoffset:
                  2 * Math.PI * 45 * (1 - displayScore / 100),
              }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>

          {/* Score text in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              className="text-3xl font-bold"
              style={{ color: ring }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {displayScore}
            </motion.div>
            <motion.div
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: ring }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              {label}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Profile Tags */}
      {tags.length > 0 && (
        <motion.div
          className="mb-5 flex flex-wrap gap-1.5 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          {tags.slice(0, 4).map((tag) => {
            const colors = tagColorMap[tag] || {
              bg: "var(--bg-input)",
              text: "var(--text-secondary)",
              border: "var(--border-default)",
            };
            return (
              <motion.span
                key={tag}
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  borderColor: colors.border,
                }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {tag}
              </motion.span>
            );
          })}
        </motion.div>
      )}

      {/* Next Best Action */}
      <motion.div
        className="rounded-xl bg-gradient-to-r p-3"
        style={{
          backgroundImage: `linear-gradient(to right, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 80%, var(--accent-secondary)))`,
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex items-start gap-2">
          <Zap className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[var(--text-on-accent)]" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-on-accent)] opacity-90">
              Next Action
            </div>
            <div className="text-xs font-semibold text-[var(--text-on-accent)] mt-1 leading-tight line-clamp-2">
              {nextAction}
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-on-accent)] mt-0.5" />
        </div>
      </motion.div>
    </motion.div>
  );
}
