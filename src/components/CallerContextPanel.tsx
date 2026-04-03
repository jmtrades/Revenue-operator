"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  MessageSquare,
  Calendar,
  AlertCircle,
  TrendingUp,
  Zap,
} from "lucide-react";

interface ContextData {
  lead: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    company: string | null;
    state: string | null;
    score: number | null;
    created_at: string;
    last_activity_at: string | null;
    days_since_activity: number | null;
  };
  profile: {
    is_returning: boolean;
    is_at_risk: boolean;
    is_stale: boolean;
    has_no_show: boolean;
    total_calls: number;
    total_messages: number;
    total_appointments: number;
    tags: string[];
    next_best_action: string;
  };
  history: {
    calls: Array<{
      id: string;
      outcome: string | null;
      created_at: string;
      direction: string;
      duration_seconds: number | null;
    }>;
    appointments: Array<{
      id: string;
      status: string;
      scheduled_at: string;
    }>;
    messages: Array<{
      id: string;
      channel: string;
      direction: string;
      created_at: string;
    }>;
  };
}

interface CallerContextPanelProps {
  leadId: string;
  workspaceId: string;
}

const tagColorMap: Record<
  string,
  { bg: string; text: string; border: string }
> = {
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

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function scoreColor(score: number | null): string {
  if (!score) return "var(--text-tertiary)";
  if (score >= 70) return "var(--status-green)";
  if (score >= 40) return "var(--status-amber)";
  return "var(--status-red)";
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function CallerContextPanel({
  leadId,
  workspaceId,
}: CallerContextPanelProps) {
  const [data, setData] = useState<ContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchContext = async () => {
      try {
        const url = `/api/leads/${encodeURIComponent(
          leadId
        )}/context?workspace_id=${encodeURIComponent(workspaceId)}`;
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load context");
        const json = (await res.json()) as { context?: ContextData };
        if (active) setData(json.context || null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Error");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchContext();
    return () => {
      active = false;
    };
  }, [leadId, workspaceId]);

  if (loading)
    return (
      <div
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-secondary)]"
        style={{ minHeight: "240px" }}
      >
        Loading context...
      </div>
    );

  if (error || !data)
    return (
      <div
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-secondary)]"
        style={{ minHeight: "240px" }}
      >
        {error || "Unable to load caller context"}
      </div>
    );

  const { profile, history } = data;

  return (
    <motion.div
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header with score bar */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Caller Intelligence
          </h2>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            System knows everything about this lead
          </p>
        </div>
        {data.lead.score !== null && (
          <div className="flex flex-col items-end gap-1">
            <div
              className="text-sm font-bold"
              style={{ color: scoreColor(data.lead.score) }}
            >
              {data.lead.score}
            </div>
            <div className="w-20 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
              <motion.div
                className="h-full"
                style={{
                  background: scoreColor(data.lead.score),
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(data.lead.score, 100)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Profile tags */}
      {profile.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {profile.tags.map((tag) => {
            const colors = tagColorMap[tag] || {
              bg: "var(--bg-input)",
              text: "var(--text-secondary)",
              border: "var(--border-default)",
            };
            return (
              <motion.div
                key={tag}
                className="inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium"
                style={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  borderColor: colors.border,
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {tag}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Next best action - prominent */}
      <motion.div
        className="bg-gradient-to-r from-[var(--accent-primary)] to-[color-mix(in_srgb,var(--accent-primary)_80%,var(--accent-secondary))] rounded-xl p-4 mb-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-start gap-3">
          <Zap className="h-4 w-4 mt-0.5 flex-shrink-0 text-[var(--text-on-accent)]" />
          <div>
            <div className="text-xs font-semibold text-[var(--text-on-accent)] uppercase tracking-wide">
              Next Best Action
            </div>
            <div className="text-sm font-bold text-[var(--text-on-accent)] mt-1">
              {profile.next_best_action}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Interaction timeline */}
      {(history.calls.length > 0 ||
        history.messages.length > 0 ||
        history.appointments.length > 0) && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3">
            Recent Activity
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {/* Calls */}
            {history.calls.slice(0, 2).map((call) => (
              <motion.div
                key={call.id}
                className="flex items-center gap-3 text-xs p-2 rounded-lg bg-[var(--bg-hover)]"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Phone
                  className="h-3.5 w-3.5 flex-shrink-0"
                  style={{ color: "var(--status-blue)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[var(--text-primary)] font-medium truncate">
                    {call.direction || "Call"}
                    {call.outcome ? ` · ${call.outcome}` : ""}
                  </div>
                  {call.duration_seconds && (
                    <div className="text-[var(--text-tertiary)]">
                      {formatDuration(call.duration_seconds)}
                    </div>
                  )}
                </div>
                <div className="text-[var(--text-tertiary)] whitespace-nowrap">
                  {formatTime(call.created_at)}
                </div>
              </motion.div>
            ))}

            {/* Messages */}
            {history.messages.slice(0, 2).map((msg) => (
              <motion.div
                key={msg.id}
                className="flex items-center gap-3 text-xs p-2 rounded-lg bg-[var(--bg-hover)]"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <MessageSquare
                  className="h-3.5 w-3.5 flex-shrink-0"
                  style={{ color: "var(--status-green)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[var(--text-primary)] font-medium">
                    {msg.channel} · {msg.direction}
                  </div>
                </div>
                <div className="text-[var(--text-tertiary)] whitespace-nowrap">
                  {formatTime(msg.created_at)}
                </div>
              </motion.div>
            ))}

            {/* Appointments */}
            {history.appointments.slice(0, 1).map((apt) => (
              <motion.div
                key={apt.id}
                className="flex items-center gap-3 text-xs p-2 rounded-lg bg-[var(--bg-hover)]"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Calendar
                  className="h-3.5 w-3.5 flex-shrink-0"
                  style={{ color: "var(--status-amber)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[var(--text-primary)] font-medium">
                    {apt.status === "confirmed"
                      ? "Scheduled"
                      : apt.status === "no_show"
                        ? "No-show"
                        : apt.status === "cancelled"
                          ? "Cancelled"
                          : apt.status}
                  </div>
                </div>
                <div className="text-[var(--text-tertiary)] whitespace-nowrap">
                  {formatTime(apt.scheduled_at)}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* History summary stats */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--border-default)]">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className="text-lg font-bold"
            style={{ color: "var(--status-blue)" }}
          >
            {profile.total_calls}
          </div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">Calls</div>
        </motion.div>
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <div
            className="text-lg font-bold"
            style={{ color: "var(--status-green)" }}
          >
            {profile.total_messages}
          </div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">
            Messages
          </div>
        </motion.div>
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div
            className="text-lg font-bold"
            style={{ color: "var(--status-amber)" }}
          >
            {profile.total_appointments}
          </div>
          <div className="text-xs text-[var(--text-tertiary)] mt-1">
            Appointments
          </div>
        </motion.div>
      </div>

      {/* Risk indicator */}
      {profile.is_at_risk && (
        <motion.div
          className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-[color-mix(in_srgb,var(--status-red)_8%,transparent)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <AlertCircle
            className="h-4 w-4 flex-shrink-0"
            style={{ color: "var(--status-red)" }}
          />
          <div className="text-xs" style={{ color: "var(--status-red)" }}>
            <span className="font-semibold">At risk.</span> Monitor closely.
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
