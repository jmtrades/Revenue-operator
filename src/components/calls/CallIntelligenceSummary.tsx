"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Target,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface CallData {
  caller_name?: string;
  phone?: string;
  direction?: string;
  duration_seconds?: number;
  outcome?: string;
  sentiment?: string;
  analysis?: Record<string, unknown>;
  transcript?: Array<{ speaker: string; text: string }>;
}

interface CallIntelligenceSummaryProps {
  callId: string;
  workspaceId: string;
  callData: CallData;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function detectObjections(transcript?: Array<{ speaker: string; text: string }>): string[] {
  if (!transcript || transcript.length === 0) return [];

  const fullText = transcript.map((u) => u.text).join(" ").toLowerCase();
  const objections: string[] = [];

  const patterns = {
    "Pricing concern": /price|cost|expensive|budget|afford|payment/i,
    "Timing objection": /busy|time|later|now|soon|not now|currently/i,
    "Competitive alternative": /already have|using|competitor|other|similar/i,
    "Uncertainty expressed": /not sure|think about|consider|maybe|uncertain/i,
  };

  Object.entries(patterns).forEach(([label, regex]) => {
    if (regex.test(fullText)) {
      objections.push(label);
    }
  });

  return objections;
}

function getRevenueSignal(outcome?: string): {
  label: string;
  value: string;
  color: string;
} {
  if (!outcome) {
    return {
      label: "Pending",
      value: "No contact made. Follow-up required.",
      color: "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300",
    };
  }

  const outcomeLower = outcome.toLowerCase();

  if (outcomeLower.includes("booked") || outcomeLower.includes("appointment")) {
    return {
      label: "High",
      value: "Appointment secured. Estimated value: ~$250",
      color: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300",
    };
  }

  if (outcomeLower.includes("interested") || outcomeLower.includes("callback")) {
    return {
      label: "Medium",
      value: "Active interest. Estimated value: ~$100 (weighted)",
      color: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
    };
  }

  if (
    outcomeLower.includes("not_interested") ||
    outcomeLower.includes("declined")
  ) {
    return {
      label: "Low",
      value: "Lead may convert with different approach.",
      color: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
    };
  }

  if (outcomeLower.includes("voicemail")) {
    return {
      label: "Pending",
      value: "No contact made. Follow-up required.",
      color: "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300",
    };
  }

  return {
    label: "Unknown",
    value: "Review transcript for details.",
    color: "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300",
  };
}

function getRecommendedAction(outcome?: string, sentiment?: string): string {
  if (!outcome) {
    return "Retry call in 4 hours. If no answer, send SMS follow-up.";
  }

  const outcomeLower = outcome.toLowerCase();
  const sentimentLower = sentiment?.toLowerCase() || "";

  if (outcomeLower.includes("booked") || outcomeLower.includes("appointment")) {
    return "Send appointment confirmation and prepare for meeting.";
  }

  if (outcomeLower.includes("interested")) {
    if (sentimentLower === "positive") {
      return "Follow up within 2 hours while interest is high.";
    }
    return "Follow up within 24 hours. Reference their expressed interest.";
  }

  if (outcomeLower.includes("callback")) {
    return "Schedule callback at requested time. Set reminder.";
  }

  if (outcomeLower.includes("not_interested") || outcomeLower.includes("declined")) {
    return "Add to nurture sequence. Try different messaging angle in 14 days.";
  }

  if (outcomeLower.includes("voicemail")) {
    return "Retry call in 4 hours. If no answer, send SMS follow-up.";
  }

  return "Review transcript and determine next action.";
}

function getWhatHappened(
  outcome?: string,
  transcript?: Array<{ speaker: string; text: string }>
): string[] {
  const points: string[] = [];

  if (!outcome) {
    return ["Call completed. Review transcript for details."];
  }

  const outcomeLower = outcome.toLowerCase();

  if (outcomeLower.includes("booked") || outcomeLower.includes("appointment")) {
    points.push("Lead showed buying intent and an appointment was successfully booked.");
  } else if (outcomeLower.includes("interested")) {
    points.push("Lead expressed interest. Follow-up recommended to convert.");
  } else if (outcomeLower.includes("callback")) {
    points.push("Lead requested a callback. Timing is critical.");
  } else if (outcomeLower.includes("not_interested") || outcomeLower.includes("declined")) {
    points.push("Lead declined. Consider adjusting approach for future contact.");
  } else if (outcomeLower.includes("voicemail")) {
    points.push("Reached voicemail. Agent left a message.");
  } else {
    points.push("Call completed. Review transcript for details.");
  }

  if (transcript && transcript.length > 0) {
    points.push(`${transcript.length} messages exchanged during the call.`);
  }

  return points;
}

function getSentimentBadge(
  sentiment?: string
): { label: string; color: string; icon: React.ReactNode } {
  if (!sentiment) {
    return {
      label: "Neutral",
      color: "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300",
      icon: "—",
    };
  }

  const sentimentLower = sentiment.toLowerCase();
  if (sentimentLower.includes("positive")) {
    return {
      label: "Positive",
      color: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300",
      icon: "😊",
    };
  }
  if (sentimentLower.includes("negative")) {
    return {
      label: "Negative",
      color: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
      icon: "😞",
    };
  }

  return {
    label: "Neutral",
    color: "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300",
    icon: "—",
  };
}

function getIntentLevel(outcome?: string): string {
  if (!outcome) return "New";
  const outcomeLower = outcome.toLowerCase();
  if (
    outcomeLower.includes("booked") ||
    outcomeLower.includes("appointment") ||
    outcomeLower.includes("interested")
  ) {
    return "High";
  }
  if (outcomeLower.includes("callback")) {
    return "Medium";
  }
  return "Low";
}

function getLeadMovement(outcome?: string): string {
  if (!outcome) return "New";
  const outcomeLower = outcome.toLowerCase();
  if (
    outcomeLower.includes("booked") ||
    outcomeLower.includes("appointment")
  ) {
    return "Advanced";
  }
  if (outcomeLower.includes("not_interested") || outcomeLower.includes("declined")) {
    return "Stalled";
  }
  return "Advanced";
}

export default function CallIntelligenceSummary({
  callData,
}: CallIntelligenceSummaryProps) {
  const callerName = callData.caller_name || "Unknown caller";
  const direction = callData.direction || "Call";
  const duration = formatDuration(callData.duration_seconds);
  const outcome = callData.outcome || "No outcome recorded";
  const sentiment = callData.sentiment;
  const transcript = callData.transcript;

  const revenueSignal = getRevenueSignal(callData.outcome);
  const recommendedAction = getRecommendedAction(callData.outcome, sentiment);
  const whatHappened = getWhatHappened(callData.outcome, transcript);
  const objections = detectObjections(transcript);
  const sentimentBadge = getSentimentBadge(sentiment);
  const intentLevel = getIntentLevel(callData.outcome);
  const leadMovement = getLeadMovement(callData.outcome);

  const containerVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.08,
      },
    },
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden"
    >
      {/* Top gradient border */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />

      <div className="p-5 space-y-5">
        {/* Header */}
        <motion.div variants={sectionVariants} className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950">
            <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Call Intelligence Brief
            </h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              {direction} with {callerName} · {duration} · {outcome}
            </p>
          </div>
        </motion.div>

        {/* What Happened */}
        <motion.div variants={sectionVariants} className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--text-secondary)]" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              What Happened
            </h3>
          </div>
          <ul className="space-y-1.5 ml-6">
            {whatHappened.map((point, idx) => (
              <li
                key={idx}
                className="text-xs text-[var(--text-secondary)] flex items-start gap-2"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] mt-1.5 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Objections Detected */}
        <motion.div variants={sectionVariants} className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--text-secondary)]" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              Objections Detected
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 ml-6">
            {objections.length > 0 ? (
              objections.map((objection, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-medium"
                >
                  {objection}
                </span>
              ))
            ) : (
              <span className="text-xs text-[var(--text-tertiary)]">
                No objections detected
              </span>
            )}
          </div>
        </motion.div>

        {/* Revenue Signal */}
        <motion.div variants={sectionVariants} className="space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[var(--text-secondary)]" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              Revenue Signal
            </h3>
          </div>
          <div
            className={cn(
              "ml-6 rounded-lg p-3 space-y-1",
              revenueSignal.color
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{revenueSignal.label}</span>
              <span className="text-xs opacity-75">revenue potential</span>
            </div>
            <p className="text-xs">{revenueSignal.value}</p>
          </div>
        </motion.div>

        {/* Recommended Next Action */}
        <motion.div variants={sectionVariants} className="space-y-2">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-[var(--text-secondary)]" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              Recommended Next Action
            </h3>
          </div>
          <div className="ml-6 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              {recommendedAction}
            </p>
          </div>
        </motion.div>

        {/* Confidence Indicators */}
        <motion.div variants={sectionVariants} className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--text-secondary)]" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">
              Confidence Indicators
            </h3>
          </div>
          <div className="ml-6 grid grid-cols-3 gap-2">
            {/* Sentiment */}
            <div className={cn(
              "rounded-lg p-2.5 text-center",
              sentimentBadge.color
            )}>
              <div className="text-lg mb-1">{sentimentBadge.icon}</div>
              <p className="text-xs font-medium">{sentimentBadge.label}</p>
              <p className="text-[10px] opacity-75">Sentiment</p>
            </div>

            {/* Intent Level */}
            <div className="rounded-lg p-2.5 text-center bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
              <div className="text-lg mb-1">
                {intentLevel === "High" ? "🎯" : intentLevel === "Medium" ? "⚡" : "📌"}
              </div>
              <p className="text-xs font-medium">{intentLevel}</p>
              <p className="text-[10px] opacity-75">Intent Level</p>
            </div>

            {/* Lead Movement */}
            <div className={cn(
              "rounded-lg p-2.5 text-center",
              leadMovement === "Advanced"
                ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                : leadMovement === "Stalled"
                  ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                  : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
            )}>
              <div className="text-lg mb-1">
                {leadMovement === "Advanced" ? "📈" : leadMovement === "Stalled" ? "⏸️" : "🆕"}
              </div>
              <p className="text-xs font-medium">{leadMovement}</p>
              <p className="text-[10px] opacity-75">Movement</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
