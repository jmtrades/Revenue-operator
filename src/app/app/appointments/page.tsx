"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useWorkspace } from "@/components/WorkspaceContext";
import { useTranslations } from "next-intl";

type AppointmentStatus = "Confirmed" | "Pending" | "Cancelled" | "Completed" | "No-Show";
type AppointmentSource = "Inbound call" | "Outbound" | "Inbox" | "Manual";

interface Appointment {
  id: string;
  date: string;
  time: string;
  contactName: string;
  type: string;
  status: AppointmentStatus;
  source: AppointmentSource;
}

function formatDate(dateStr: string, t: (key: string, opts?: Record<string, string>) => string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return t("appointments.today", { defaultValue: "Today" });
  if (d.getTime() === tomorrow.getTime()) return t("appointments.tomorrow", { defaultValue: "Tomorrow" });
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function getAppointmentStatusDisplay(status: AppointmentStatus, t: (k: string, opts?: Record<string, string>) => string): string {
  const map: Record<AppointmentStatus, string> = {
    "Confirmed": t("appointments.statusLabels.confirmed", { defaultValue: "Confirmed" }),
    "Pending": t("appointments.statusLabels.pending", { defaultValue: "Pending" }),
    "Cancelled": t("appointments.statusLabels.cancelled", { defaultValue: "Cancelled" }),
    "Completed": t("appointments.statusLabels.completed", { defaultValue: "Completed" }),
    "No-Show": t("appointments.statusLabels.noShow", { defaultValue: "No-Show" }),
  };
  return map[status] ?? status;
}

function getAppointmentSourceDisplay(source: AppointmentSource, t: (k: string, opts?: Record<string, string>) => string): string {
  const map: Record<AppointmentSource, string> = {
    "Inbound call": t("appointments.defaultSource", { defaultValue: "Inbound call" }),
    "Outbound": t("appointments.sourceOutbound", { defaultValue: "Outbound" }),
    "Inbox": t("appointments.sourceInbox", { defaultValue: "Inbox" }),
    "Manual": t("appointments.sourceManual", { defaultValue: "Manual" }),
  };
  return map[source] ?? source;
}

function statusColor(status: AppointmentStatus): string {
  switch (status) {
    case "Confirmed":
      return "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20";
    case "Pending":
      return "bg-[var(--accent-warning,#f59e0b)]/10 text-[var(--accent-warning,#f59e0b)] border-[var(--accent-warning,#f59e0b)]/20";
    case "Cancelled":
      return "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-medium)]";
    case "Completed":
      return "bg-[var(--bg-card)] text-[var(--text-tertiary)] border-[var(--border-medium)]";
    case "No-Show":
      return "bg-[var(--accent-danger,#ef4444)]/10 text-[var(--accent-danger,#ef4444)] border-[var(--accent-danger,#ef4444)]/20";
    default:
      return "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-medium)]";
  }
}

function mapApiStatus(s: string): AppointmentStatus {
  if (s === "confirmed") return "Confirmed";
  if (s === "cancelled") return "Cancelled";
  if (s === "completed") return "Completed";
  if (s === "no_show") return "No-Show";
  return "Pending";
}

export default function AppointmentsPage() {
  const t = useTranslations();
  const { workspaceId } = useWorkspace();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [modalActionLoading, setModalActionLoading] = useState<"reschedule" | "cancel" | "remind" | null>(null);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [newRescheduleDate, setNewRescheduleDate] = useState<string>("");
  const [newRescheduleTime, setNewRescheduleTime] = useState<string>("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  const dayDefaults: Record<string, string> = {
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun",
  };

  useEffect(() => {
    document.title = t("appointments.pageTitle", { defaultValue: "Appointments — Recall Touch" });
    return () => {
      document.title = "";
    };
  }, [t]);

  const refetchAppointments = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    setFetchError(null);
    fetch(`/api/appointments?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load appointments (${r.status})`);
        return r.json();
      })
      .then((data: { appointments?: { id: string; date: string; time: string; contactName: string; type: string; status: string; source: string }[] }) => {
        const list = data.appointments ?? [];
        if (list.length > 0) {
          setAppointments(
            list.map((a) => ({
              id: a.id,
              date: a.date,
              time: a.time,
              contactName: a.contactName,
              type: a.type,
              status: mapApiStatus(a.status),
              source: (a.source || "Inbound call") as AppointmentSource,
            }))
          );
        } else {
          setAppointments([]);
        }
      })
      .catch((err) => {
        setFetchError(err instanceof Error ? err.message : t("appointments.loadError", { defaultValue: "Failed to load appointments" }));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [workspaceId, t]);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    refetchAppointments();
  }, [workspaceId, refetchAppointments]);

  const isEmpty = appointments.length === 0;

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const days: (Date | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const getAppointmentsForDay = (day: Date) =>
    appointments.filter((a) => {
      const d = new Date(`${a.date}T00:00:00`);
      return (
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
      );
    });

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleReschedule = useCallback(async () => {
    if (!selected || !newRescheduleDate || !newRescheduleTime) {
      showToast(t("appointments.actions.rescheduleError", { defaultValue: "Please select date and time" }), "error");
      return;
    }

    setModalActionLoading("reschedule");
    try {
      const response = await fetch(`/api/appointments/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: newRescheduleDate,
          time: newRescheduleTime,
        }),
      });

      if (!response.ok) throw new Error(`Failed to reschedule (${response.status})`);

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === selected.id ? { ...a, date: newRescheduleDate, time: newRescheduleTime } : a
        )
      );
      setSelected((prev) =>
        prev ? { ...prev, date: newRescheduleDate, time: newRescheduleTime } : null
      );
      showToast(t("appointments.actions.rescheduleSuccess", { defaultValue: "Appointment rescheduled" }), "success");
      setShowRescheduleForm(false);
      setNewRescheduleDate("");
      setNewRescheduleTime("");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("appointments.actions.rescheduleFailed", { defaultValue: "Failed to reschedule" }),
        "error"
      );
    } finally {
      setModalActionLoading(null);
    }
  }, [selected, newRescheduleDate, newRescheduleTime, t, showToast]);

  const handleCancelAppointment = useCallback(async () => {
    if (!selected) return;

    setModalActionLoading("cancel");
    try {
      const response = await fetch(`/api/appointments/${selected.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) throw new Error(`Failed to cancel (${response.status})`);

      setAppointments((prev) => prev.filter((a) => a.id !== selected.id));
      setSelected(null);
      setShowCancelConfirm(false);
      showToast(t("appointments.actions.cancelSuccess", { defaultValue: "Appointment cancelled" }), "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("appointments.actions.cancelFailed", { defaultValue: "Failed to cancel appointment" }),
        "error"
      );
    } finally {
      setModalActionLoading(null);
    }
  }, [selected, t, showToast]);

  const handleSendReminder = useCallback(async () => {
    if (!selected) return;

    setModalActionLoading("remind");
    try {
      const response = await fetch(`/api/appointments/${selected.id}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) throw new Error(`Failed to send reminder (${response.status})`);

      showToast(t("appointments.actions.reminderSuccess", { defaultValue: "Reminder sent" }), "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("appointments.actions.reminderFailed", { defaultValue: "Failed to send reminder" }),
        "error"
      );
    } finally {
      setModalActionLoading(null);
    }
  }, [selected, t, showToast]);

  const handleSyncCalendar = useCallback(async () => {
    setSyncLoading(true);
    try {
      const response = await fetch("/api/integrations/google-calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const errData = (await response.json().catch(() => null)) as { code?: string; error?: string } | null;
        if (errData?.code === "calendar_connection_expired") {
          showToast(t("appointments.syncExpired", { defaultValue: "Calendar connection expired. Reconnect in Settings." }), "error");
        } else {
          throw new Error(errData?.error || `Sync failed (${response.status})`);
        }
        return;
      }

      const result = (await response.json()) as { synced?: number; created?: number; updated?: number };
      const { synced = 0, created = 0, updated = 0 } = result;

      if (synced > 0) {
        showToast(
          t("appointments.syncSuccess", {
            defaultValue: `Synced {{count}} event(s): {{created}} new, {{updated}} updated`,
            count: String(synced),
            created: String(created),
            updated: String(updated),
          }),
          "success"
        );
        refetchAppointments();
      } else {
        showToast(t("appointments.syncNoEvents", { defaultValue: "No new events to sync" }), "success");
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("appointments.syncFailed", { defaultValue: "Failed to sync calendar" }),
        "error"
      );
    } finally {
      setSyncLoading(false);
    }
  }, [t, showToast, refetchAppointments]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
        <Breadcrumbs items={[{ label: "Dashboard", href: "/app" }, { label: "Appointments" }]} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">{t("appointments.heading", { defaultValue: "Appointments" })}</h1>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              {t("appointments.subtitle", { defaultValue: "AI-managed meetings. Appointments are confirmed, reminded, and followed up automatically." })}
            </p>
            {fetchError && (
              <div className="mt-3 flex items-center gap-2">
                <p className="text-sm text-[var(--accent-danger,#ef4444)]">{fetchError}</p>
                <button onClick={() => { setFetchError(null); setLoading(true); refetchAppointments(); }} className="mt-0 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}>
                  Try Again
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncCalendar}
              disabled={syncLoading}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-medium)] transition-[background-color,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-hover)]"
              title={t("appointments.syncTooltip", { defaultValue: "Sync Google Calendar events" })}
            >
              {syncLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border-2 border-[var(--text-tertiary)] border-t-[var(--text-primary)] rounded-full animate-spin" />
                  {t("appointments.syncing", { defaultValue: "Syncing..." })}
                </span>
              ) : (
                t("appointments.syncButton", { defaultValue: "Sync Calendar" })
              )}
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] ${
                view === "list" ? "bg-[var(--bg-card)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t("appointments.viewList", { defaultValue: "List" })}
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] ${
                view === "calendar" ? "bg-[var(--bg-card)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t("appointments.viewCalendar", { defaultValue: "Calendar" })}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8 text-center shadow-[var(--shadow-card)]">
            <div className="inline-block animate-spin">
              <div className="w-8 h-8 border-2 border-[var(--text-tertiary)] border-t-[var(--accent-primary)] rounded-full" />
            </div>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">{t("appointments.loading", { defaultValue: "Loading appointments..." })}</p>
          </div>
        ) : fetchError ? (
          <div className="rounded-2xl border border-[var(--accent-danger,#ef4444)]/30 bg-[var(--accent-danger,#ef4444)]/5 p-8 text-center">
            <p className="text-sm text-[var(--accent-danger,#ef4444)]">{fetchError}</p>
            <button
              type="button"
              onClick={() => { setLoading(true); setFetchError(null); refetchAppointments(); }}
              className="mt-3 px-4 py-2 rounded-xl border border-[var(--border-medium)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
            >
              {t("appointments.retry", { defaultValue: "Retry" })}
            </button>
          </div>
        ) : isEmpty ? (
          <div className="space-y-6">
            <EmptyState
              icon={Calendar}
              title={t("appointments.empty.title", { defaultValue: "No appointments scheduled yet" })}
              description={t("appointments.empty.body", { defaultValue: "Once your AI operator books meetings, they'll appear here with automatic confirmations and reminders." })}
              primaryAction={{
                label: t("appointments.empty.action", { defaultValue: "Open operator settings" }),
                href: "/app/settings/agent",
              }}
              secondaryAction={{
                label: t("appointments.viewCalls", { defaultValue: "View Calls" }),
                href: "/app/calls",
              }}
            />
            <div className="mt-6 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{t("appointments.getStartedTitle", { defaultValue: "Get started with appointments" })}</p>
              <p className="text-xs text-[var(--text-secondary)] mb-3">{t("appointments.getStartedDesc", { defaultValue: "Your AI operator will book appointments automatically during calls. Here's how to set up:" })}</p>
              <div className="space-y-2">
                <Link href="/app/settings/integrations" className="flex items-center gap-2 text-xs text-[var(--accent-primary)] hover:underline">
                  <Calendar className="w-3.5 h-3.5" />
                  {t("appointments.connectCalendar", { defaultValue: "Connect your Google Calendar or Outlook" })}
                </Link>
                <Link href="/app/settings/call-rules" className="flex items-center gap-2 text-xs text-[var(--accent-primary)] hover:underline">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t("appointments.configureRules", { defaultValue: "Configure call rules and business hours" })}
                </Link>
                <Link href="/app/agents" className="flex items-center gap-2 text-xs text-[var(--accent-primary)] hover:underline">
                  <Calendar className="w-3.5 h-3.5" />
                  {t("appointments.trainAgent", { defaultValue: "Train your operator to handle booking requests" })}
                </Link>
              </div>
            </div>
          </div>
        ) : view === "list" ? (
          <div
            className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("appointments.table.dateTime", { defaultValue: "Date / Time" })}</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("appointments.table.contact", { defaultValue: "Contact" })}</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("appointments.table.type", { defaultValue: "Type" })}</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("appointments.table.status", { defaultValue: "Status" })}</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("appointments.table.source", { defaultValue: "Source" })}</th>
                    <th className="py-3 px-4 w-8" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr
                      key={apt.id}
                      className="border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]"
                    >
                      <td className="py-3 px-4 text-[var(--text-primary)]">
                        {formatDate(apt.date, t)} · {apt.time}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{apt.contactName}</td>
                      <td className="py-3 px-4 text-[var(--text-tertiary)]">{apt.type}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusColor(apt.status)}`}
                        >
                          {getAppointmentStatusDisplay(apt.status, t)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)] text-xs">{getAppointmentSourceDisplay(apt.source, t)}</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelected(apt)}
                          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-[color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                          aria-label={t("appointments.viewDetails", { defaultValue: "View details" })}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          view === "calendar" && (
            <div className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() - 1,
                      ),
                    )
                  }
                  className="p-2 rounded-lg hover:bg-[var(--bg-inset)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  {currentMonth.toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() + 1,
                      ),
                    )
                  }
                  className="p-2 rounded-lg hover:bg-[var(--bg-inset)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {(["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((key) => (
                  <div
                    key={key}
                    className="text-center text-xs text-[var(--text-secondary)] py-1"
                  >
                    {t(`appointments.days.${key}`, { defaultValue: dayDefaults[key] })}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentMonth).map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;
                  const dayAppts = getAppointmentsForDay(day);
                  const isToday =
                    day.toDateString() === new Date().toDateString();
                  const isSelected =
                    selectedDay?.toDateString() === day.toDateString();
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={[
                        "aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-sm transition-[background-color,border-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]",
                        isSelected
                          ? "bg-white/10 border border-[var(--border-default)]"
                          : "hover:bg-[var(--bg-inset)]",
                        !isSelected && isToday
                          ? "border border-white/[0.12]"
                          : "",
                        dayAppts.length > 0
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)]",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span>{day.getDate()}</span>
                      {dayAppts.length > 0 && (
                        <div className="flex gap-0.5">
                          {dayAppts.slice(0, 3).map((_, j) => (
                            <div
                              key={j}
                              className="w-1 h-1 rounded-full bg-white"
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedDay && (
                <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                  <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                    {selectedDay.toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </h4>
                  {getAppointmentsForDay(selectedDay).length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)]">{t("appointments.noAppointments", { defaultValue: "No appointments" })}</p>
                  ) : (
                    <div className="space-y-2">
                      {getAppointmentsForDay(selectedDay).map((appt) => (
                        <div
                          key={appt.id}
                          className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3"
                        >
                          <p className="text-sm text-[var(--text-primary)]">
                            {appt.type || appt.contactName}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {formatDate(appt.date, t)} · {appt.time}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {appt.contactName}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {!isEmpty && (
          <div className="mt-6 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Link href="/app/settings" className="hover:text-[var(--text-primary)] transition-[color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]">
              {t("appointments.settings", { defaultValue: "Settings" })}
            </Link>
            <span aria-hidden>·</span>
            <Link href="/app/calendar" className="hover:text-[var(--text-primary)] transition-[color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]">
              {t("appointments.calendarView", { defaultValue: "Calendar view" })}
            </Link>
          </div>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-labelledby="appointment-detail-title"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-w-sm w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="appointment-detail-title" className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              {selected.contactName}
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-secondary)]">{t("appointments.dateTimeLabel", { defaultValue: "Date & time" })}</dt>
                <dd className="text-[var(--text-primary)]">{formatDate(selected.date, t)} · {selected.time}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-secondary)]">{t("appointments.typeLabel", { defaultValue: "Type" })}</dt>
                <dd className="text-[var(--text-secondary)]">{selected.type}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-secondary)]">{t("appointments.statusLabel", { defaultValue: "Status" })}</dt>
                <dd>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusColor(selected.status)}`}>
                    {getAppointmentStatusDisplay(selected.status, t)}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-secondary)]">{t("appointments.sourceLabel", { defaultValue: "Source" })}</dt>
                <dd className="text-[var(--text-tertiary)] text-xs">{getAppointmentSourceDisplay(selected.source, t)}</dd>
              </div>
            </dl>

            {showRescheduleForm && (
              <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                <h3 className="text-xs font-medium text-[var(--text-secondary)] mb-3 uppercase">
                  {t("appointments.actions.pickNewDateTime", { defaultValue: "Pick new date & time" })}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                      {t("appointments.actions.date", { defaultValue: "Date" })}
                    </label>
                    <input
                      type="date"
                      value={newRescheduleDate}
                      onChange={(e) => setNewRescheduleDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-medium)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-focus)] transition-[border-color] duration-[var(--duration-fast)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                      {t("appointments.actions.time", { defaultValue: "Time" })}
                    </label>
                    <input
                      type="time"
                      value={newRescheduleTime}
                      onChange={(e) => setNewRescheduleTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-inset)] border border-[var(--border-medium)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-focus)] transition-[border-color] duration-[var(--duration-fast)]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRescheduleForm(false);
                        setNewRescheduleDate("");
                        setNewRescheduleTime("");
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                    >
                      {t("appointments.actions.cancel", { defaultValue: "Cancel" })}
                    </button>
                    <button
                      type="button"
                      onClick={handleReschedule}
                      disabled={modalActionLoading === "reschedule"}
                      className="flex-1 px-3 py-2 rounded-lg bg-[var(--accent-primary)] text-xs font-medium text-white hover:bg-[var(--accent-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-[background-color,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                    >
                      {modalActionLoading === "reschedule"
                        ? t("appointments.actions.rescheduling", { defaultValue: "Rescheduling..." })
                        : t("appointments.actions.rescheduleConfirm", { defaultValue: "Reschedule" })}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showCancelConfirm && (
              <div className="mt-4 pt-4 border-t border-[var(--border-default)] p-3 rounded-lg bg-[var(--accent-danger,#ef4444)]/10 border border-[var(--accent-danger,#ef4444)]/30">
                <div className="flex gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-[var(--accent-danger,#ef4444)] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--text-primary)]">
                    {t("appointments.actions.cancelConfirmText", { defaultValue: "Are you sure? This cannot be undone." })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                  >
                    {t("appointments.actions.keep", { defaultValue: "Keep" })}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAppointment}
                    disabled={modalActionLoading === "cancel"}
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--accent-danger,#ef4444)] text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-[background-color,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                  >
                    {modalActionLoading === "cancel"
                      ? t("appointments.actions.cancelling", { defaultValue: "Cancelling..." })
                      : t("appointments.actions.confirmCancel", { defaultValue: "Cancel Appointment" })}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-[var(--border-default)] flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRescheduleForm(!showRescheduleForm);
                    setShowCancelConfirm(false);
                  }}
                  disabled={modalActionLoading !== null}
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                >
                  {t("appointments.actions.reschedule", { defaultValue: "Reschedule" })}
                </button>
                <button
                  type="button"
                  onClick={() => handleSendReminder()}
                  disabled={modalActionLoading !== null}
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                >
                  {modalActionLoading === "remind"
                    ? t("appointments.actions.sending", { defaultValue: "Sending..." })
                    : t("appointments.actions.sendReminder", { defaultValue: "Send Reminder" })}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelConfirm(!showCancelConfirm);
                    setShowRescheduleForm(false);
                  }}
                  disabled={modalActionLoading !== null}
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-medium)] text-xs font-medium text-[var(--accent-danger,#ef4444)] hover:bg-[var(--accent-danger,#ef4444)]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                >
                  {t("appointments.actions.cancelAppointment", { defaultValue: "Cancel Appointment" })}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-medium)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                >
                  {t("appointments.close", { defaultValue: "Close" })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium transition-[opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] ${
            toast.type === "success"
              ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
              : "bg-[var(--accent-danger,#ef4444)]/20 text-[var(--accent-danger,#ef4444)] border border-[var(--accent-danger,#ef4444)]/30"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
