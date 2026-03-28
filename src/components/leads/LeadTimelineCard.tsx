"use client";

import { motion } from "framer-motion";
import {
  Phone,
  MessageSquare,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/animations";

export interface LeadTimelineEvent {
  type: "call" | "message" | "appointment" | "status_change";
  description: string;
  timestamp: string;
  outcome?: string;
}

interface LeadTimelineCardProps {
  events: LeadTimelineEvent[];
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${Math.max(0, diffMins)}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

function getEventIconAndColor(
  type: LeadTimelineEvent["type"]
): {
  Icon: React.ComponentType<{ className: string }>;
  color: string;
} {
  switch (type) {
    case "call":
      return { Icon: Phone, color: "var(--status-blue)" };
    case "message":
      return { Icon: MessageSquare, color: "var(--status-green)" };
    case "appointment":
      return { Icon: Calendar, color: "var(--status-amber)" };
    case "status_change":
      return { Icon: RefreshCw, color: "var(--text-tertiary)" };
    default:
      return { Icon: RefreshCw, color: "var(--text-tertiary)" };
  }
}

function getEventLabel(type: LeadTimelineEvent["type"]): string {
  switch (type) {
    case "call":
      return "Call";
    case "message":
      return "Message";
    case "appointment":
      return "Appointment";
    case "status_change":
      return "Status Change";
    default:
      return "Event";
  }
}

export function LeadTimelineCard({ events }: LeadTimelineCardProps) {
  if (events.length === 0) {
    return (
      <motion.div
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Timeline
        </h3>
        <p className="text-sm text-[var(--text-tertiary)]">
          No interactions yet
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
        Timeline
      </h3>

      <motion.div
        className="relative space-y-3 pl-5"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Vertical connecting line */}
        <div
          className="absolute left-1.5 top-1 bottom-0 w-px bg-[var(--border-default)]"
          aria-hidden="true"
        />

        {events.slice(0, 8).map((event, idx) => {
          const { color } = getEventIconAndColor(event.type);
          const label = getEventLabel(event.type);
          const relTime = formatRelativeTime(event.timestamp);

          return (
            <motion.div
              key={`${event.type}:${idx}`}
              variants={staggerItem}
              className="relative flex gap-3"
            >
              {/* Event icon dot */}
              <div className="relative mt-0.5 flex-shrink-0">
                <div
                  className="h-3 w-3 rounded-full border-2 border-[var(--bg-card)]"
                  style={{ backgroundColor: color }}
                />
              </div>

              {/* Event content */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {label}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] whitespace-nowrap">
                    {relTime}
                  </span>
                </div>

                <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-2">
                  {event.description}
                </p>

                {event.outcome && (
                  <motion.div
                    className="mt-1.5 inline-flex items-center rounded-md border border-[var(--border-default)] bg-[var(--bg-input)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    {event.outcome}
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}

        {events.length > 8 && (
          <motion.div
            variants={staggerItem}
            className="relative pl-3 py-2 text-xs text-[var(--text-tertiary)]"
          >
            +{events.length - 8} more interactions
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
