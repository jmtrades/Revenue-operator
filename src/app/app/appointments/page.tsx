"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWorkspace } from "@/components/WorkspaceContext";
import { useTranslations } from "next-intl";

type AppointmentStatus = "Confirmed" | "Pending" | "Cancelled" | "Completed";
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

function formatDate(dateStr: string, t: (key: string) => string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return t("appointments.today");
  if (d.getTime() === tomorrow.getTime()) return t("appointments.tomorrow");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function getAppointmentStatusDisplay(status: AppointmentStatus, t: (k: string) => string): string {
  const map: Record<AppointmentStatus, string> = {
    "Confirmed": t("appointments.statusLabels.confirmed"),
    "Pending": t("appointments.statusLabels.pending"),
    "Cancelled": t("appointments.statusLabels.cancelled"),
    "Completed": t("appointments.statusLabels.completed"),
  };
  return map[status] ?? status;
}

function getAppointmentSourceDisplay(source: AppointmentSource, t: (k: string) => string): string {
  const map: Record<AppointmentSource, string> = {
    "Inbound call": t("appointments.defaultSource"),
    "Outbound": t("appointments.sourceOutbound"),
    "Inbox": t("appointments.sourceInbox"),
    "Manual": t("appointments.sourceManual"),
  };
  return map[source] ?? source;
}

function statusColor(status: AppointmentStatus): string {
  switch (status) {
    case "Confirmed":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "Pending":
      return "bg-amber-500/20 text-amber-200 border-amber-500/30";
    case "Cancelled":
      return "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-medium)]";
    case "Completed":
      return "bg-[var(--bg-card)] text-[var(--text-tertiary)] border-[var(--border-medium)]";
    default:
      return "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-medium)]";
  }
}

function mapApiStatus(s: string): AppointmentStatus {
  if (s === "confirmed") return "Confirmed";
  if (s === "cancelled") return "Cancelled";
  if (s === "completed" || s === "no_show") return "Completed";
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

  useEffect(() => {
    document.title = t("appointments.pageTitle");
    return () => {
      document.title = "";
    };
  }, [t]);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setFetchError(null);
    fetch(`/api/appointments?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load appointments (${r.status})`);
        return r.json();
      })
      .then((data: { appointments?: { id: string; date: string; time: string; contactName: string; type: string; status: string; source: string }[] }) => {
        if (cancelled) return;
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
        }
      })
      .catch((err) => {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : t("appointments.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [workspaceId]);

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

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)]">{t("appointments.heading")}</h1>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              {t("appointments.description")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] ${
                view === "list" ? "bg-[var(--bg-card)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t("appointments.viewList")}
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] ${
                view === "calendar" ? "bg-[var(--bg-card)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t("appointments.viewCalendar")}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8 text-center">
            <div className="inline-block animate-spin">
              <div className="w-8 h-8 border-2 border-[var(--text-tertiary)] border-t-[var(--accent-primary)] rounded-full" />
            </div>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">{t("appointments.loading")}</p>
          </div>
        ) : fetchError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
            <p className="text-sm text-red-300">{fetchError}</p>
            <button
              type="button"
              onClick={() => { setLoading(true); setFetchError(null); window.location.reload(); }}
              className="mt-3 px-4 py-2 rounded-xl border border-[var(--border-medium)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
            >
              {t("appointments.retry")}
            </button>
          </div>
        ) : isEmpty ? (
          <EmptyState
            icon={Calendar}
            title={t("appointments.empty.title")}
            description={t("appointments.empty.body")}
            primaryAction={{
              label: t("appointments.viewCalls"),
              href: "/app/calls",
            }}
          />
        ) : view === "list" ? (
          <div
            className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("appointments.table.dateTime")}</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("appointments.table.contact")}</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("appointments.table.type")}</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("appointments.table.status")}</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">{t("appointments.table.source")}</th>
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
                          aria-label={t("appointments.viewDetails")}
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
                    {t(`appointments.days.${key}`)}
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
                    <p className="text-sm text-[var(--text-secondary)]">{t("appointments.noAppointments")}</p>
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
              {t("appointments.settings")}
            </Link>
            <span aria-hidden>·</span>
            <Link href="/app/calendar" className="hover:text-[var(--text-primary)] transition-[color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]">
              {t("appointments.calendarView")}
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
            className="max-w-sm w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="appointment-detail-title" className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              {selected.contactName}
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-secondary)]">{t("appointments.dateTimeLabel")}</dt>
                <dd className="text-[var(--text-primary)]">{formatDate(selected.date, t)} · {selected.time}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-secondary)]">{t("appointments.typeLabel")}</dt>
                <dd className="text-[var(--text-secondary)]">{selected.type}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-secondary)]">{t("appointments.statusLabel")}</dt>
                <dd>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusColor(selected.status)}`}>
                    {getAppointmentStatusDisplay(selected.status, t)}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--text-secondary)]">{t("appointments.sourceLabel")}</dt>
                <dd className="text-[var(--text-tertiary)] text-xs">{getAppointmentSourceDisplay(selected.source, t)}</dd>
              </div>
            </dl>
            <div className="mt-4 pt-4 border-t border-[var(--border-default)] flex justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border-medium)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
              >
                {t("appointments.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
