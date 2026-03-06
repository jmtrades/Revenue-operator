"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";

const PAGE_TITLE = "Appointments — Recall Touch";

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
      return "bg-zinc-600/30 text-zinc-400 border-zinc-500/30";
    case "Completed":
      return "bg-zinc-500/20 text-zinc-300 border-zinc-500/30";
    default:
      return "bg-zinc-600/30 text-zinc-400 border-zinc-500/30";
  }
}

function mapApiStatus(s: string): AppointmentStatus {
  if (s === "confirmed") return "Confirmed";
  if (s === "cancelled") return "Cancelled";
  if (s === "completed" || s === "no_show") return "Completed";
  return "Pending";
}

export default function AppointmentsPage() {
  const { workspaceId } = useWorkspace();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");

  useEffect(() => {
    document.title = PAGE_TITLE;
    return () => {
      document.title = "";
    };
  }, []);

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

  return (
    <div className="min-h-screen text-white" style={{ background: "#080d19" }}>
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
                view === "list" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                view === "calendar" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Calendar
            </button>
          </div>
        </div>

        {isEmpty ? (
          <div
            className="rounded-2xl border border-zinc-800 p-12 text-center"
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
                      className="border-b hover:bg-zinc-800/50 transition-colors"
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
          <div
            className="rounded-2xl border p-6 text-center text-zinc-400 text-sm"
            style={{ borderColor: "#1f2937", background: "#111827" }}
          >
            Calendar view: switch to List to see all appointments. Full calendar syncs when you connect Google Calendar in Settings.
          </div>
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
                className="px-4 py-2 rounded-xl border text-sm font-medium text-zinc-300 hover:bg-zinc-800"
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
