"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

export default function CompliancePage() {
  const { workspaceId } = useWorkspace();
  const searchParams = useSearchParams();
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Compliance" subtitle="Jurisdiction settings, framework overview, and record export." />
      {!workspaceId ? (
        <EmptyState icon="pulse" title="Select a context." subtitle="Compliance settings appear here." />
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-muted)" }}>Overview</h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Governed records are tagged by jurisdiction and review depth. Export compliance records as PDF or CSV for audit and regulatory submission.
            </p>
            <button type="button" className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>Export PDF</button>
          </div>
          <div className="rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-muted)" }}>Audit trail</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>Who accessed what record and when. Logs are retained per workspace.</p>
          </div>
          <p className="text-sm">
            <Link href={`/dashboard/policies${q}`} style={{ color: "var(--text-muted)" }}>Policies</Link>
          </p>
        </div>
      )}
    </div>
  );
}
