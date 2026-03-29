"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Phone, Calendar, MessageSquare, DollarSign, Clock } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface BriefingData {
  calls_handled: number;
  appointments_booked: number;
  follow_ups_sent: number;
  leads_recovered: number;
  missed_calls_recovered: number;
  revenue_influenced_cents: number;
  hours_saved_estimate: number;
  period_hours: number;
}

interface AutonomousBriefingProps {
  workspaceId: string;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function hasActivity(data: BriefingData): boolean {
  return (
    data.calls_handled > 0 ||
    data.appointments_booked > 0 ||
    data.follow_ups_sent > 0 ||
    data.missed_calls_recovered > 0
  );
}

export function AutonomousBriefing({ workspaceId }: AutonomousBriefingProps) {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetch<BriefingData>(
          `/api/dashboard/briefing?workspace_id=${encodeURIComponent(workspaceId)}`,
          { credentials: "include" }
        );
        setData(response);
      } catch (err) {
        console.error("[AutonomousBriefing] error:", err);
        setError(err instanceof Error ? err.message : "Failed to load briefing");
      } finally {
        setLoading(false);
      }
    };

    if (workspaceId) {
      void load();
    }
  }, [workspaceId]);

  if (loading) {
    return (
      <motion.div
        className="briefing-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-5 md:p-6">
          <div className="h-5 w-40 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-[var(--bg-hover)] skeleton-shimmer" />
            <div className="h-4 w-3/4 rounded bg-[var(--bg-hover)] skeleton-shimmer" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (error || !data) {
    return null;
  }

  const hasData = hasActivity(data);

  const revenueFormatted = formatCurrency(data.revenue_influenced_cents);
  const revenuePlain = data.revenue_influenced_cents / 100;

  return (
    <motion.section
      className="briefing-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="p-5 md:p-6">
        {/* Header */}
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
            Your Agent
          </p>
          <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)] mt-1">
            {hasData ? "While you were away" : "Ready and waiting"}
          </h2>
        </div>

        {/* Content */}
        {hasData ? (
          <div className="space-y-4">
            {/* Main briefing narrative */}
            <div className="flex flex-col gap-4">
              {/* Calls + Appointments + Follow-ups row */}
              {(data.calls_handled > 0 ||
                data.appointments_booked > 0 ||
                data.follow_ups_sent > 0) && (
                <div className="flex items-start gap-3 pb-3 border-b border-[var(--border-default)]">
                  <div className="flex gap-2 flex-wrap">
                    {data.calls_handled > 0 && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Phone className="w-4 h-4 text-[var(--accent-primary)]" />
                        <span>
                          Handled <span className="font-semibold text-[var(--text-primary)]">{data.calls_handled}</span>{" "}
                          {data.calls_handled === 1 ? "call" : "calls"}
                        </span>
                      </div>
                    )}
                    {data.appointments_booked > 0 && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        <span>
                          Booked <span className="font-semibold text-[var(--text-primary)]">{data.appointments_booked}</span>{" "}
                          {data.appointments_booked === 1 ? "appointment" : "appointments"}
                        </span>
                      </div>
                    )}
                    {data.follow_ups_sent > 0 && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                        <span>
                          Sent <span className="font-semibold text-[var(--text-primary)]">{data.follow_ups_sent}</span> follow-up{data.follow_ups_sent === 1 ? "" : "s"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Missed calls + Leads recovered row */}
              {(data.missed_calls_recovered > 0 || data.leads_recovered > 0) && (
                <div className="flex items-start gap-3 pb-3 border-b border-[var(--border-default)]">
                  <div className="flex gap-2 flex-wrap">
                    {data.missed_calls_recovered > 0 && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Phone className="w-4 h-4 text-amber-500" />
                        <span>
                          Recovered <span className="font-semibold text-[var(--text-primary)]">{data.missed_calls_recovered}</span> missed{" "}
                          {data.missed_calls_recovered === 1 ? "opportunity" : "opportunities"}
                        </span>
                      </div>
                    )}
                    {data.leads_recovered > 0 && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <span>
                          Reactivated <span className="font-semibold text-[var(--text-primary)]">{data.leads_recovered}</span>{" "}
                          {data.leads_recovered === 1 ? "lead" : "leads"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Revenue + Hours saved row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
                {data.revenue_influenced_cents > 0 && (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: "color-mix(in srgb, var(--accent-warning) 12%, transparent)" }}
                    >
                      <DollarSign className="w-5 h-5 text-[var(--accent-warning)]" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] font-medium">Influenced</p>
                      <p className="text-lg md:text-xl font-bold text-[var(--accent-warning)] tabular-nums">
                        {revenueFormatted}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {revenuePlain > 0 && revenuePlain.toLocaleString("en-US", { maximumFractionDigits: 0 })} in opportunity
                      </p>
                    </div>
                  </div>
                )}

                {data.hours_saved_estimate > 0 && (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}
                    >
                      <Clock className="w-5 h-5 text-[var(--accent-primary)]" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] font-medium">Time Saved</p>
                      <p className="text-lg md:text-xl font-bold text-[var(--accent-primary)] tabular-nums">
                        ~{data.hours_saved_estimate.toFixed(1)}h
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">of manual work</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Agent note */}
            <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
              <p className="text-xs text-[var(--text-secondary)] italic">
                Your autonomous operator handled it. All {data.period_hours}h.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Your agent is ready and waiting for calls.
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              Calls handled, appointments booked, and follow-ups will appear here.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .briefing-card {
          @apply rounded-xl border border-[var(--border-default)] bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-surface)];
          background-image: radial-gradient(
            circle at 100% 0%,
            rgba(79, 70, 229, 0.05) 0%,
            transparent 50%
          );
        }
      `}</style>
    </motion.section>
  );
}
