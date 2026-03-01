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

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All contacts", target_filter: {} },
  { value: "new", label: "New leads only", target_filter: { state: "NEW" } },
  { value: "engaged", label: "Recently engaged", target_filter: { min_activity_days: 7 } },
];

const STEPS = ["Name", "Type", "Audience", "Review"];

export default function NewCampaignPage() {
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [type, setType] = useState("lead_followup");
  const [audience, setAudience] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetFilter = AUDIENCE_OPTIONS.find((a) => a.value === audience)?.target_filter ?? {};
  const canNext = step === 1 ? name.trim().length > 0 : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep((s) => Math.min(4, s + 1));
      setError(null);
      return;
    }
    if (!workspaceId || !name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), type, target_filter: Object.keys(targetFilter).length > 0 ? targetFilter : undefined }),
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
      <div className="flex gap-2 mb-6">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className="text-xs font-medium px-2 py-1 rounded"
            style={{
              color: i + 1 === step ? "var(--accent-primary)" : "var(--text-tertiary)",
              background: i + 1 === step ? "var(--accent-primary-subtle)" : "transparent",
            }}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="rounded-lg border p-6 space-y-4" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
        {step === 1 && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Campaign name</label>
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
        )}
        {step === 2 && (
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
        )}
        {step === 3 && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-primary)" }}
            >
              {AUDIENCE_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        )}
        {step === 4 && (
          <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}><strong style={{ color: "var(--text-primary)" }}>Name:</strong> {name}</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}><strong style={{ color: "var(--text-primary)" }}>Type:</strong> {CAMPAIGN_TYPES.find((t) => t.value === type)?.label ?? type}</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}><strong style={{ color: "var(--text-primary)" }}>Audience:</strong> {AUDIENCE_OPTIONS.find((a) => a.value === audience)?.label ?? audience}</p>
          </div>
        )}
        {error && <p className="text-sm" style={{ color: "var(--accent-danger)" }}>{error}</p>}
        <div className="flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={!canNext || submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--text-inverse)" }}
          >
            {step < 4 ? "Next" : submitting ? "Creating…" : "Create campaign"}
          </button>
          <Link href="/dashboard/campaigns" className="px-4 py-2 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}
