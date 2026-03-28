"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Phone, Calendar, UserPlus, Megaphone, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ActivityEntry {
  id: string;
  type: "call" | "appointment" | "lead" | "campaign";
  description: string;
  timestamp: string;
  actor?: string;
}

interface ActivityLogProps {
  workspaceId: string;
}

const TYPE_CONFIG = {
  call: {
    icon: Phone,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "Call",
  },
  appointment: {
    icon: Calendar,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "Appointment",
  },
  lead: {
    icon: UserPlus,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    label: "Lead",
  },
  campaign: {
    icon: Megaphone,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    label: "Campaign",
  },
};

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-hover)]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 bg-[var(--bg-hover)] rounded" />
            <div className="h-3 w-32 bg-[var(--bg-hover)] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityLog({ workspaceId }: ActivityLogProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<ActivityEntry[]>(
          `/api/activity-log?workspace_id=${encodeURIComponent(workspaceId)}`,
          { credentials: "include" }
        );
        setEntries(data || []);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to load activities";
        setError(errorMsg);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [workspaceId]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) return <ActivitySkeleton />;

  if (error) {
    return (
      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg bg-[var(--bg-hover)] border border-[var(--border-default)] p-6 text-center">
        <p className="text-sm text-[var(--text-secondary)]">No activity in the last 7 days</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--accent-primary)] to-transparent" />

      {/* Activity items */}
      <div className="space-y-4">
        {entries.map((entry, idx) => {
          const config = TYPE_CONFIG[entry.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: idx * 0.05,
              }}
              className="flex gap-4 relative z-10"
            >
              {/* Icon circle */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center ${config.color}`}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="flex-1 pt-0.5 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{entry.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-[var(--text-tertiary)]">{formatTime(entry.timestamp)}</p>
                  {entry.actor && (
                    <>
                      <span className="text-xs text-[var(--border-default)]">•</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                        {entry.actor}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
