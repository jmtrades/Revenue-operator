"use client";

import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

export default function IntegrationsPage() {
  const { workspaceId } = useWorkspace();

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title="Integrations" subtitle="Connect calendar and CRM." />
        <EmptyState icon="watch" title="Select a context." />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Integrations" subtitle="Connect Google Calendar, CRM, and other tools." />
      <div className="rounded-lg border p-6 space-y-4" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
        <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Google Calendar</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Sync appointments and availability.</p>
          </div>
          <button type="button" className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>Connect</button>
        </div>
        <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>CRM</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Import contacts and sync outcomes.</p>
          </div>
          <button type="button" className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>Connect</button>
        </div>
        <Link href="/dashboard/settings" className="inline-block text-sm mt-4" style={{ color: "var(--accent)" }}>Settings</Link>
      </div>
    </div>
  );
}
