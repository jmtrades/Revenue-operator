"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface Appointment {
  id: string;
  lead_id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  status: string;
  notes: string | null;
}

export default function CalendarPage() {
  const { workspaceId } = useWorkspace();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    fetchWithFallback<{ appointments: Appointment[] }>(
      `/api/appointments?workspace_id=${encodeURIComponent(workspaceId)}`,
      { credentials: "include" }
    )
      .then((res) => {
        if (res.data?.appointments) setAppointments(res.data.appointments);
        else setAppointments([]);
        if (res.error) setError(res.error);
      })
      .catch(() => setError("Could not load appointments."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!workspaceId) {
      setAppointments([]);
      setLoading(false);
      setError(null);
      return;
    }
    load();
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title="Calendar" subtitle="Appointments." />
        <EmptyState icon="watch" title="Select a context." subtitle="Appointments appear here." />
      </div>
    );
  }

  const byDate = appointments.reduce((acc, a) => {
    const d = new Date(a.start_time).toDateString();
    if (!acc[d]) acc[d] = [];
    acc[d].push(a);
    return acc;
  }, {} as Record<string, Appointment[]>);
  const sortedDates = Object.keys(byDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Calendar" subtitle="Booked appointments." />
      {loading ? (
        <ListSkeleton rows={5} header />
      ) : error ? (
        <div className="rounded-lg border py-12 px-6 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{error}</p>
          <button type="button" onClick={load} className="text-sm font-medium px-4 py-2 rounded-lg" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>Retry</button>
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-lg border py-12 px-6 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No appointments yet.</p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <Link href="/dashboard/activity" className="text-sm" style={{ color: "var(--accent)" }}>Activity</Link>
            <Link href="/dashboard/integrations" className="text-sm" style={{ color: "var(--text-secondary)" }}>Connect calendar</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateStr) => (
            <section key={dateStr}>
              <h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-muted)" }}>{dateStr}</h2>
              <ul className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
                {byDate[dateStr].map((a) => (
                  <li key={a.id} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
                    <Link href={`/dashboard/record/lead/${a.lead_id}`} className="block px-4 py-3 hover:opacity-90" style={{ color: "var(--text-primary)" }}>
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {new Date(a.start_time).toLocaleTimeString()} {a.location ? ` · ${a.location}` : ""} · {a.status}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
