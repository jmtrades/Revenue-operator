"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
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

  useEffect(() => {
    document.title = t("appointments.pageTitle");
    return () => {
      document.title = "";
    };
  }, [t]);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    fetch(`/api/appointments?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { appointments: [] }))
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
      .catch(() => {});
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
            <h1 className="text-xl md:text-2xl font-semibold text-white">Appointments</h1>
            <p className="text-sm text-zinc-400 mt-1">
              All booked appointments from calls, campaigns, and inbox.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                view === "list" ? "bg-[var(--bg-card)] text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                view === "calendar" ? "bg-[var(--bg-card)] text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Calendar
            </button>
          </div>
        </div>

        {isEmpty ? (
          <div
            className="rounded-2xl border border-[var(--border-default)] p-12 text-center"
            style={{ background: "#111827" }}
          >
            <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" aria-hidden />
            <p className="text-sm font-medium text-white mb-1">Appointments show up when callers book through your AI</p>
            <p className="text-xs text-zinc-500 mb-4">
              Enable appointment booking in your agent settings to let callers schedule directly.
            </p>
            <Link
              href="/app/agents"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white underline underline-offset-2 hover:no-underline"
            >
              Agent settings →
            </Link>
          </div>
        ) : view === "list" ? (
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: "#1f2937", background: "#111827" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "#1f2937" }}>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Date / Time</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Contact</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Type</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Status</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500">Source</th>
                    <th className="py-3 px-4 w-8" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr
                      key={apt.id}
                      className="border-b hover:bg-[var(--bg-hover)] transition-colors"
                      style={{ borderColor: "#1f2937" }}
                    >
                      <td className="py-3 px-4 text-white">
                        {formatDate(apt.date)} · {apt.time}
                      </td>
                      <td className="py-3 px-4 text-zinc-300">{apt.contactName}</td>
                      <td className="py-3 px-4 text-zinc-400">{apt.type}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusColor(apt.status)}`}
                        >
                          {apt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-500 text-xs">{apt.source}</td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelected(apt)}
                          className="p-1 rounded text-zinc-500 hover:text-white"
                          aria-label="View details"
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
            <div className="bg-[#111113] border border-white/[0.06] rounded-2xl p-6">
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
                  className="p-2 rounded-lg hover:bg-white/[0.04] text-[#8B8B8D] hover:text-[#EDEDEF] transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-sm font-medium text-[#EDEDEF]">
                  {currentMonth.toLocaleDateString("en-US", {
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
                  className="p-2 rounded-lg hover:bg-white/[0.04] text-[#8B8B8D] hover:text-[#EDEDEF] transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs text-[#5A5A5C] py-1"
                  >
                    {d}
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
                        "aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-sm transition-all",
                        isSelected
                          ? "bg-[#4F8CFF]/20 border border-[#4F8CFF]/40"
                          : "hover:bg-white/[0.04]",
                        !isSelected && isToday
                          ? "border border-white/[0.12]"
                          : "",
                        dayAppts.length > 0
                          ? "text-[#EDEDEF]"
                          : "text-[#5A5A5C]",
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
                              className="w-1 h-1 rounded-full bg-[#4F8CFF]"
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedDay && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <h4 className="text-sm font-medium text-[#EDEDEF] mb-3">
                    {selectedDay.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </h4>
                  {getAppointmentsForDay(selectedDay).length === 0 ? (
                    <p className="text-sm text-[#5A5A5C]">No appointments</p>
                  ) : (
                    <div className="space-y-2">
                      {getAppointmentsForDay(selectedDay).map((appt) => (
                        <div
                          key={appt.id}
                          className="bg-[#0A0A0B] border border-white/[0.06] rounded-xl p-3"
                        >
                          <p className="text-sm text-[#EDEDEF]">
                            {appt.type || appt.contactName}
                          </p>
                          <p className="text-xs text-[#5A5A5C] mt-0.5">
                            {formatDate(appt.date)} · {appt.time}
                          </p>
                          <p className="text-xs text-[#8B8B8D] mt-0.5">
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
          <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
            <Link href="/app/settings" className="hover:text-white transition-colors">
              Settings
            </Link>
            <span aria-hidden>·</span>
            <Link href="/app/calendar" className="hover:text-white transition-colors">
              Calendar view
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
            className="max-w-sm w-full rounded-2xl border p-5 shadow-xl"
            style={{ borderColor: "#1f2937", background: "#111827" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="appointment-detail-title" className="text-sm font-semibold text-white mb-3">
              {selected.contactName}
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Date & time</dt>
                <dd className="text-white">{formatDate(selected.date)} · {selected.time}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Type</dt>
                <dd className="text-zinc-300">{selected.type}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Status</dt>
                <dd>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusColor(selected.status)}`}>
                    {selected.status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Source</dt>
                <dd className="text-zinc-400 text-xs">{selected.source}</dd>
              </div>
            </dl>
            <div className="mt-4 pt-4 border-t flex justify-end" style={{ borderColor: "#1f2937" }}>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-xl border text-sm font-medium text-zinc-300 hover:bg-[var(--bg-hover)]"
                style={{ borderColor: "#374151" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
