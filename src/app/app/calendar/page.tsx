"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useWorkspace } from "@/components/WorkspaceContext";

type Status = "confirmed" | "pending";

type Appointment = {
  id: string;
  contact: string;
  service: string;
  date: string;
  time: string;
  durationMinutes: number;
  status: Status;
  start_time?: string;
  end_time?: string;
  external_calendar_id?: string;
};

function apiToAppointment(a: {
  id: string;
  title: string;
  start_time: string;
  end_time?: string | null;
  status: string;
  contactName?: string;
  external_calendar_id?: string;
}): Appointment {
  const start = new Date(a.start_time);
  const end = a.end_time ? new Date(a.end_time) : new Date(start.getTime() + 60 * 60 * 1000);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return {
    id: a.id,
    contact: a.contactName ?? "Contact",
    service: a.title,
    date: start.toISOString().slice(0, 10),
    time: start.toTimeString().slice(0, 5),
    durationMinutes,
    status: a.status === "cancelled" ? "pending" : "confirmed",
    start_time: a.start_time,
    end_time: a.end_time ?? undefined,
    external_calendar_id: a.external_calendar_id,
  };
}

export default function AppCalendarPage() {
  const { workspaceId } = useWorkspace();
  const [view, setView] = useState<"week" | "month">("week");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formContact, setFormContact] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formService, setFormService] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formDuration, setFormDuration] = useState(60);
  const [availabilitySlots, setAvailabilitySlots] = useState<string[]>([]);

  const fetchAppointments = useCallback(() => {
    if (!workspaceId) return;
    fetch(`/api/appointments?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { appointments: [] }))
      .then((data: { appointments?: Array<{ id: string; title: string; start_time: string; end_time?: string | null; status: string; contactName?: string; external_calendar_id?: string }> }) => {
        const list = (data.appointments ?? []).filter((a) => a.status !== "cancelled");
        setAppointments(list.map(apiToAppointment));
      })
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) {
      const id = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(id);
    }
    const loadId = setTimeout(() => setLoading(true), 0);
    fetchAppointments();
    fetch("/api/integrations/google-calendar/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { connected?: boolean }) => setGoogleConnected(Boolean(d.connected)))
      .catch(() => setGoogleConnected(false));
    const outlookId = setTimeout(() => setOutlookConnected(false), 0);
    return () => {
      clearTimeout(loadId);
      clearTimeout(outlookId);
    };
  }, [workspaceId, fetchAppointments]);

  useEffect(() => {
    if (!workspaceId || !formDate) {
      const id = setTimeout(() => setAvailabilitySlots([]), 0);
      return () => clearTimeout(id);
    }
    if (!googleConnected) return;
    fetch(`/api/integrations/google-calendar/availability?workspace_id=${encodeURIComponent(workspaceId)}&date=${formDate}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((d: { slots?: string[] }) => setAvailabilitySlots(d.slots ?? []))
      .catch(() => setAvailabilitySlots([]));
  }, [workspaceId, formDate, googleConnected]);

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 12 }, (_, i) => 8 + i);

  const handleSaveNew = () => {
    if (!formContact.trim() || !formService.trim() || !formDate.trim() || !workspaceId) return;
    setSaving(true);
    const start = new Date(`${formDate}T${formTime}:00`);
    const end = new Date(start.getTime() + formDuration * 60 * 1000);
    fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        contactName: formContact.trim(),
        contactPhone: formPhone.trim() || formContact.trim(),
        title: formService.trim(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((created) => {
        if (created) {
          setAppointments((prev) => [...prev, apiToAppointment(created)]);
          setShowNew(false);
          setSelected(apiToAppointment(created));
        }
      })
      .finally(() => setSaving(false));
  };

  const _handleReschedule = (newDate: string, newTime: string, newDuration: number) => {
    if (!selected?.start_time) return;
    const start = new Date(`${newDate}T${newTime}:00`);
    const end = new Date(start.getTime() + newDuration * 60 * 1000);
    setSaving(true);
    fetch(`/api/appointments/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ start_time: start.toISOString(), end_time: end.toISOString() }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((updated) => {
        if (updated) {
          const apt = apiToAppointment(updated);
          setSelected(apt);
          setAppointments((prev) => prev.map((a) => (a.id === selected.id ? apt : a)));
        }
      })
      .finally(() => setSaving(false));
  };

  const [deleteConfirm, setDeleteConfirm] = useState<Appointment | null>(null);

  const confirmDeleteAppointment = () => {
    if (!deleteConfirm) return;
    setSaving(true);
    fetch(`/api/appointments/${deleteConfirm.id}`, { method: "DELETE", credentials: "include" })
      .then((r) => r.ok)
      .then((ok) => {
        if (ok) {
          setAppointments((prev) => prev.filter((a) => a.id !== deleteConfirm.id));
          setSelected(null);
        }
      })
      .finally(() => {
        setDeleteConfirm(null);
        setSaving(false);
      });
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
            {loading ? "Loading…" : `${appointments.length} appointments`}
          </p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Loading calendar…</div>
        ) : view === "week" ? (
          <div className="overflow-x-auto">
            <div className="min-w-[720px] grid grid-cols-[48px_repeat(7,minmax(0,1fr))] text-[10px]">
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
          </div>
        ) : (
          <div className="p-4 text-xs text-zinc-400">
            Month view is simplified here. Week view shows detailed blocks.
          </div>
        )}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="text-sm font-medium text-white">Google Calendar</p>
            <p className="text-xs text-zinc-500">
              {googleConnected ? "Synced. Availability and bookings sync two-way." : "Sync availability and keep your AI and personal calendar aligned."}
            </p>
          </div>
          {googleConnected ? (
            <span className="text-xs text-zinc-400">Connected</span>
          ) : (
            <a
              href="/api/integrations/google-calendar/auth"
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100"
            >
              Connect
            </a>
          )}
        </div>
        <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="text-sm font-medium text-white">Microsoft Outlook</p>
            <p className="text-xs text-zinc-500">
              Two-way sync with Outlook Calendar (coming soon).
            </p>
          </div>
          {outlookConnected ? (
            <span className="text-xs text-zinc-400">Connected</span>
          ) : (
            <button
              type="button"
              disabled
              className="self-start sm:self-auto px-4 py-2 rounded-xl border border-[var(--border-medium)] text-zinc-500 text-xs font-medium cursor-not-allowed"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      <p>
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">
          ← Activity
        </Link>
      </p>

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
            <div>
              <p className="text-sm font-semibold text-white">
                {selected.contact} — {selected.service}
              </p>
              <p className="text-xs text-zinc-500">
                {selected.date} · {selected.time} · {selected.durationMinutes} min
                {selected.external_calendar_id ? " · Synced to calendar" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setDeleteConfirm(selected)}
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
                <label className="block text-[11px] text-zinc-500 mb-1">Phone</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none"
                  placeholder="+1 555 000 0000"
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
            </div>
            {availabilitySlots.length > 0 && (
              <p className="text-[11px] text-zinc-500">Available times (Google): {availabilitySlots.slice(0, 8).join(", ")}{availabilitySlots.length > 8 ? "…" : ""}</p>
            )}
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
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
