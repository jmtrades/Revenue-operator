"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

const TABS = ["Overview", "Transcript", "Follow-ups", "Audit trail"] as const;

export default function CallRecordDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const searchParams = useSearchParams();
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between gap-4 mb-6">
        <PageHeader title={id ? `Record ${id}` : "Record"} subtitle="Call record detail." />
        <Link href={`/dashboard/calls${q}`} className="text-sm" style={{ color: "var(--text-muted)" }}>Back to calls</Link>
      </div>
      <div className="flex gap-2 border-b mb-6" style={{ borderColor: "var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
            style={{
              borderColor: tab === t ? "var(--accent)" : "transparent",
              color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
        {tab === "Overview" && (
          <div className="space-y-4 text-sm">
            <p style={{ color: "var(--text-secondary)" }}>Call metadata, audio, summary, and commitments.</p>
            <p style={{ color: "var(--text-muted)" }}>No data for this record.</p>
          </div>
        )}
        {tab === "Transcript" && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Timestamped transcript with speaker labels.</p>
        )}
        {tab === "Follow-ups" && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Scheduled follow-up actions linked to this record.</p>
        )}
        {tab === "Audit trail" && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Chronological list of actions on this record.</p>
        )}
      </div>
    </div>
  );
}
