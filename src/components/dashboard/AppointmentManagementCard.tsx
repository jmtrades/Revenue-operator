"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CalendarCheck, Clock, ExternalLink, X } from "lucide-react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";

interface Appointment {
  id: string;
  lead_id: string;
  lead_name: string | null;
  lead_phone: string;
  scheduled_at: string;
  duration_minutes: number;
  status: "confirmed" | "pending" | "cancelled" | "completed" | "no_show";
  meeting_url: string | null;
  description: string | null;
}

const STATUS_COLORS: Record<Appointment["status"], string> = {
  confirmed: "bg-emerald-500/10 text-emerald-400",
  pending: "bg-amber-500/10 text-amber-400",
  cancelled: "bg-red-500/10 text-red-400",
  completed: "bg-blue-500/10 text-blue-400",
  no_show: "bg-gray-500/10 text-gray-400",
};

export function AppointmentManagementCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    fetch(
      `/api/appointments?workspace_id=${encodeURIComponent(workspaceId)}&status=confirmed&limit=5`,
      {
        credentials: "include",
      }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { appointments?: Appointment[] } | null) => {
        const appts = data?.appointments ?? [];
        // Sort by scheduled_at date ascending (nearest first)
        appts.sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() -
            new Date(b.scheduled_at).getTime()
        );
        setAppointments(appts);
      })
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="h-5 w-40 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
        <div className="space-y-3">
          <div className="h-16 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
          <div className="h-16 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Upcoming Appointments
            </h2>
          </div>
          <Link
            href="/app/appointments"
            className="text-xs text-[var(--accent-primary)] font-medium hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="py-8 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No upcoming confirmed appointments. Schedule a call with a lead to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-section p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Upcoming Appointments
          </h2>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
            {appointments.length}
          </span>
        </div>
        <Link
          href="/app/appointments"
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          View all
        </Link>
      </div>

      <div className="space-y-3">
        {appointments.map((appt) => {
          const displayName = appt.lead_name || appt.lead_phone;
          const scheduledDate = new Date(appt.scheduled_at);
          const formattedDate = scheduledDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={appt.id}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {displayName}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      {formattedDate}
                    </span>
                    <span className="text-[var(--text-tertiary)]">
                      {appt.duration_minutes} min
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-medium px-2 py-1 rounded-full flex-shrink-0 ml-2 ${
                    STATUS_COLORS[appt.status]
                  }`}
                >
                  {appt.status === "no_show"
                    ? "No show"
                    : appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                </span>
              </div>

              {/* Description if available */}
              {appt.description && (
                <p className="text-xs text-[var(--text-tertiary)] mb-3 line-clamp-2">
                  {appt.description}
                </p>
              )}

              {/* Meeting URL and Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-default)]">
                {appt.meeting_url && (
                  <a
                    href={appt.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline flex-shrink-0"
                  >
                    Join <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <div className="flex-1" />
                <button
                  onClick={async () => {
                    if (
                      confirm(
                        "Are you sure you want to cancel this appointment?"
                      )
                    ) {
                      try {
                        const res = await fetch(
                          `/api/appointments/${appt.id}?workspace_id=${encodeURIComponent(
                            workspaceId
                          )}`,
                          {
                            method: "PATCH",
                            credentials: "include",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ status: "cancelled" }),
                          }
                        );
                        if (res.ok) {
                          load();
                        }
                      } catch (e) {
                        console.error("Failed to cancel appointment", e);
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                  title="Cancel appointment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
