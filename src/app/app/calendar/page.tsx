"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Status = "confirmed" | "pending";

type Appointment = {
  id: string;
  contact: string;
  service: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: Status;
};

const STORAGE_KEY = "rt_calendar";

const DEMO_APPOINTMENTS: Appointment[] = [
  { id: "apt-demo-1", contact: "Mike Johnson", service: "Plumbing — sink", date: new Date().toISOString().slice(0, 10), time: "10:00", durationMinutes: 60, status: "confirmed" },
  { id: "apt-demo-2", contact: "Sarah Chen", service: "Dental cleaning", date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: "09:00", durationMinutes: 45, status: "confirmed" },
  { id: "apt-demo-3", contact: "James Wilson", service: "Roof estimate", date: new Date(Date.now() + 172800000).toISOString().slice(0, 10), time: "15:00", durationMinutes: 90, status: "pending" },
];

function loadAppointments(): Appointment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEMO_APPOINTMENTS;
    const parsed = JSON.parse(raw) as Appointment[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEMO_APPOINTMENTS;
  } catch {
    return DEMO_APPOINTMENTS;
  }
}

function saveAppointments(next: Appointment[]) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export default function AppCalendarPage() {
  const [view, setView] = useState<"week" | "month">("week");
  const [appointments, setAppointments] = useState<Appointment[]>(() =>
    typeof window === "undefined" ? DEMO_APPOINTMENTS : loadAppointments(),
  );
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [googleToast, setGoogleToast] = useState<string | null>(null);

  const [formContact, setFormContact] = useState("");
  const [formService, setFormService] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formDuration, setFormDuration] = useState(60);
  const [formStatus, setFormStatus] = useState<Status>("confirmed");

  useEffect(() => {
    if (!googleToast) return;
    const id = window.setTimeout(() => setGoogleToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [googleToast]);

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 12 }, (_, i) => 8 + i); // 8–19

  const handleSaveNew = () => {
    if (!formContact.trim() || !formService.trim() || !formDate.trim()) return;
    const appt: Appointment = {
      id: `a-${Date.now()}`,
      contact: formContact.trim(),
      service: formService.trim(),
      date: formDate,
      time: formTime,
      durationMinutes: formDuration,
      status: formStatus,
    };
    const next = [...appointments, appt];
    setAppointments(next);
    saveAppointments(next);
    setShowNew(false);
    setSelected(appt);
  };

  const handleUpdateSelected = (partial: Partial<Appointment>) => {
    if (!selected) return;
    const nextSelected = { ...selected, ...partial };
    setSelected(nextSelected);
    const next = appointments.map((a) => (a.id === selected.id ? nextSelected : a));
    setAppointments(next);
    saveAppointments(next);
  };

  const handleCancelSelected = () => {
    if (!selected) return;
    handleUpdateSelected({ status: "pending" });
  };

  const [deleteConfirm, setDeleteConfirm] = useState<typeof selected>(null);

  const handleDeleteSelected = () => {
    if (!selected) return;
    setDeleteConfirm(selected);
  };

  const confirmDeleteAppointment = () => {
    if (!deleteConfirm) return;
    const next = appointments.filter((a) => a.id !== deleteConfirm.id);
    setAppointments(next);
    setSelected(null);
    setDeleteConfirm(null);
    saveAppointments(next);
  };

  return (
    <div className="relative max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-xl font-semibold text-white">Calendar</h1>
          <button
            type="button"
            className="px-2 py-1 rounded-xl border border-[var(--border-medium)] text-[11px] text-zinc-300 hover:border-[var(--border-medium)]"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView("week")}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-medium ${
                view === "week" ? "bg-white text-black" : "bg-[var(--bg-input)] border border-[var(--border-default)] text-zinc-400"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setView("month")}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-medium ${
                view === "month" ? "bg-white text-black" : "bg-[var(--bg-input)] border border-[var(--border-default)] text-zinc-400"
              }`}
            >
              Month
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="hidden sm:inline-flex items-center gap-1.5 bg-white text-black font-semibold rounded-xl px-4 py-2 text-sm hover:bg-zinc-100"
          >
            + New Appointment
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowNew(true)}
        className="sm:hidden mb-3 w-full bg-white text-black font-semibold rounded-xl px-4 py-2 text-sm hover:bg-zinc-100"
      >
        + New Appointment
      </button>

      <div className="mb-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden">
        <div className="px-4 py-2 border-b border-[var(--border-default)] flex items-center justify-between">
          <p className="text-xs text-zinc-400">8 AM – 8 PM · This {view === "week" ? "week" : "month"}</p>
          <p className="text-[11px] text-zinc-500">
            {appointments.length} appointments
          </p>
        </div>
        {view === "week" ? (
          <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] text-[10px]">
            <div className="border-r border-[var(--border-default)] bg-black/40" />
            {weekDays.map((d) => (
              <div
                key={d}
                className="border-r border-[var(--border-default)] px-2 py-1 text-center text-zinc-400 bg-black/40"
              >
                {d}
              </div>
            ))}
            {hours.map((h) => (
              <>
                <div
                  key={`h-${h}`}
                  className="border-t border-[var(--border-default)] px-1 py-2 text-right text-[10px] text-zinc-500 bg-black/40"
                >
                  {h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`}
                </div>
                {weekDays.map((d) => (
                  <div
                    key={`${h}-${d}`}
                    className="border-t border-r border-[var(--border-default)] relative min-h-[40px]"
                  >
                    {appointments
                      .filter((a) => a.time.startsWith(h.toString().padStart(2, "0")))
                      .map((a) => {
                        const statusClasses =
                          a.status === "confirmed"
                            ? "border-green-500 bg-green-500/15"
                            : "border-amber-500 bg-amber-500/15";
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setSelected(a)}
                            className={`absolute inset-x-1 top-1 rounded-md border-l-4 px-1.5 py-1 text-[10px] text-left text-white ${statusClasses}`}
                          >
                            <span className="block truncate">
                              {a.contact} — {a.service}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                ))}
              </>
            ))}
          </div>
        ) : (
          <div className="p-4 text-xs text-zinc-400">
            Month view is simplified here. Week view shows detailed blocks.
          </div>
        )}
      </div>

      <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <p className="text-sm font-medium text-white">Connect Google Calendar</p>
          <p className="text-xs text-zinc-500">
            Sync availability and keep your AI and personal calendar aligned.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setGoogleToast("Google Calendar integration is available on Growth and Scale plans.")}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100"
        >
          Connect
        </button>
      </div>

      <p>
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">
          ← Activity
        </Link>
      </p>

      {googleToast && (
        <div className="fixed bottom-4 right-4 z-40 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-sm text-zinc-100 shadow-lg">
          {googleToast}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-w-sm w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">
                  {selected.contact} — {selected.service}
                </p>
                <p className="text-xs text-zinc-500">
                  {selected.date} · {selected.time} · {selected.durationMinutes} min
                </p>
              </div>
              <select
                value={selected.status}
                onChange={(e) => handleUpdateSelected({ status: e.target.value as Status })}
                className="px-2 py-1 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[11px] text-zinc-200 focus:outline-none"
              >
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={handleCancelSelected}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-medium)] text-[11px] text-zinc-300 hover:border-[var(--border-medium)]"
              >
                Reschedule
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-medium)] text-[11px] text-zinc-300 hover:border-[var(--border-medium)]"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          open
          title="Remove appointment?"
          message={`Remove "${deleteConfirm.contact} — ${deleteConfirm.service}"? This cannot be undone.`}
          confirmLabel="Remove"
          variant="danger"
          onConfirm={confirmDeleteAppointment}
          onClose={() => setDeleteConfirm(null)}
        />
      )}

      {showNew && (
        <div
          className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowNew(false)}
        >
          <div
            className="max-w-sm w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold text-white mb-1">New appointment</h2>
            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Contact</label>
                <input
                  type="text"
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none"
                  placeholder="Sarah Chen"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Service</label>
                <input
                  type="text"
                  value={formService}
                  onChange={(e) => setFormService(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none"
                  placeholder="Cleaning, estimate, consultation…"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white focus:border-[var(--border-medium)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Time</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white focus:border-[var(--border-medium)] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    min={15}
                    max={180}
                    value={formDuration}
                    onChange={(e) =>
                      setFormDuration(Number(e.target.value || 0) || formDuration)
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white focus:border-[var(--border-medium)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as Status)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-zinc-200 focus:outline-none"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="px-3 py-2 rounded-xl border border-[var(--border-medium)] text-xs text-zinc-300 hover:border-[var(--border-medium)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNew}
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
