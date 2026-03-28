"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

interface OperatorPercentileProps {
  workspaceId: string;
  recoveryScore?: number;
}

export function OperatorPercentile({ recoveryScore = 0 }: OperatorPercentileProps) {
  // Derive percentile tier from recovery score
  const getPercentileTier = (score: number): { tier: string; gradient: string; textColor: string } => {
    if (score >= 90) return { tier: "Top 5% of operators", gradient: "from-emerald-500 to-emerald-600", textColor: "text-emerald-700" };
    if (score >= 80) return { tier: "Top 15% of operators", gradient: "from-emerald-400 to-emerald-500", textColor: "text-emerald-600" };
    if (score >= 70) return { tier: "Top 25% of operators", gradient: "from-blue-400 to-blue-500", textColor: "text-blue-600" };
    if (score >= 60) return { tier: "Top 40% of operators", gradient: "from-blue-400 to-blue-500", textColor: "text-blue-600" };
    if (score >= 50) return { tier: "Top 55% of operators", gradient: "from-amber-400 to-amber-500", textColor: "text-amber-600" };
    return { tier: "Building momentum", gradient: "from-gray-400 to-gray-500", textColor: "text-gray-600" };
  };

  const tier = getPercentileTier(recoveryScore);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r ${tier.gradient} bg-opacity-10 border border-current border-opacity-20 backdrop-blur-sm`}
    >
      <Trophy className="w-4 h-4 text-[var(--accent-primary)]" />
      <span className={`text-sm font-semibold ${tier.textColor}`}>{tier.tier}</span>
      <div className="text-xs text-[var(--text-secondary)] opacity-70 pl-1">
        Based on Revenue Recovery Score™
      </div>
    </motion.div>
  );
}
