"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  PhoneOff,
  Calendar,
  MessageSquare,
  Clock,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface CallEvent {
  id: string;
  type: "call_started" | "call_ended" | "appointment_booked" | "follow_up_sent";
  timestamp: string;
  description: string;
  outcome?: string;
}

interface Summary {
  activity: { id: string; at: string; line: string }[];
}

const eventTypeConfig = {
  call_started: {
    icon: Phone,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  call_ended: {
    icon: PhoneOff,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  appointment_booked: {
    icon: Calendar,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  follow_up_sent: {
    icon: MessageSquare,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
};

function getRelativeTime(isoString: string): string {
  const now = new Date();
  const eventTime = new Date(isoString);
  const diffMs = now.getTime() - eventTime.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) return "just now";
  if (diffMins === 1) return "1m ago";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours === 1) return "1h ago";
  if (diffHours < 24) return `${diffHours}h ago`;
  return "1d+ ago";
}

function parseActivityLine(line: string): { type: CallEvent["type"]; description: string; outcome?: string } {
  // Parse "Inbound call · booked" or "Outbound call · interested"
  if (line.includes("call")) {
    const outcome = line.split("·")[1]?.trim() || "";
    if (outcome.includes("booked")) {
      return {
        type: "appointment_booked",
        description: "Appointment booked from call",
        outcome,
      };
    }
    return {
      type: "call_ended",
      description: `${line.includes("Inbound") ? "Inbound" : "Outbound"} call completed`,
      outcome,
    };
  }
  return {
    type: "follow_up_sent",
    description: line,
  };
}

interface LiveCallFeedProps {
  workspaceId: string;
}

export function LiveCallFeed({ workspaceId }: LiveCallFeedProps) {
  const [events, setEvents] = useState<CallEvent[]>([]);
  const [hasActivity, setHasActivity] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const fetchData = async () => {
      try {
        const data = await apiFetch<Summary>(`/api/dashboard/summary?workspace_id=${encodeURIComponent(workspaceId)}`);

        if (data.activity && data.activity.length > 0) {
          const transformed = data.activity.slice(0, 5).map((a) => {
            const parsed = parseActivityLine(a.line);
            return {
              id: a.id,
              type: parsed.type,
              timestamp: a.at,
              description: parsed.description,
              outcome: parsed.outcome,
            };
          });

          setEvents(transformed);
          setHasActivity(true);
          setIsLive(true);
          setError(null);

          // Fade out "LIVE" indicator after 3 seconds of inactivity
          const timer = setTimeout(() => setIsLive(false), 3000);
          return () => clearTimeout(timer);
        } else {
          setHasActivity(false);
          setIsLive(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
        setHasActivity(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  return (
    <div className="dash-section p-5 md:p-6">
      {/* Header with LIVE indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--accent-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Live operator activity
          </h2>
          {isLive && (
            <motion.div
              className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30"
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-red-500">LIVE</span>
            </motion.div>
          )}
        </div>
      </div>

      {error && (
        <div className="text-xs text-[var(--text-tertiary)] text-center py-2">
          {error}
        </div>
      )}

      {!hasActivity ? (
        <div className="py-8 text-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-3"
          >
            <Phone className="w-6 h-6 text-[var(--text-tertiary)] opacity-50" />
          </motion.div>
          <p className="text-sm text-[var(--text-secondary)]">
            Waiting for calls...
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Recent activity will appear here
          </p>
        </div>
      ) : (
        <motion.div
          className="space-y-0 max-h-64 overflow-y-auto pr-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {events.map((event, idx) => {
            const config = eventTypeConfig[event.type];
            const Icon = config.icon;

            return (
              <motion.div
                key={event.id}
                className="flex items-start gap-3 px-3 py-2.5 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
              >
                <div className={`${config.bgColor} p-1.5 rounded-md shrink-0 mt-0.5`}>
                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm text-[var(--text-primary)] truncate">
                      {event.description}
                    </p>
                    <span className="text-[10px] text-[var(--text-tertiary)] whitespace-nowrap shrink-0">
                      {getRelativeTime(event.timestamp)}
                    </span>
                  </div>
                  {event.outcome && (
                    <div className="mt-1">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[var(--bg-inset)] text-[10px] font-medium text-[var(--text-tertiary)] capitalize">
                        {event.outcome.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
