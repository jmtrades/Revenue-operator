"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

const CAMPAIGN_TYPES = [
  { value: "lead_followup", label: "Lead follow-up" },
  { value: "appointment_reminder", label: "Appointment reminder" },
  { value: "reactivation", label: "Reactivation" },
  { value: "custom", label: "Custom" },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [name, setName] = useState("");
  const [type, setType] = useState("lead_followup");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), type }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to create campaign");
      router.push("/dashboard/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title="New campaign" subtitle="Create an outbound campaign." />
        <EmptyState icon="watch" title="Select a context." subtitle="Choose a workspace first." />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="New campaign" subtitle="Set up an outbound call campaign." />
      <form onSubmit={handleSubmit} className="rounded-lg border p-6 space-y-4" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tuesday follow-ups"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
          >
            {CAMPAIGN_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm" style={{ color: "var(--accent-danger)" }}>{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--text-inverse)" }}
          >
            {submitting ? "Creating…" : "Create campaign"}
          </button>
          <Link href="/dashboard/campaigns" className="px-4 py-2 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}
