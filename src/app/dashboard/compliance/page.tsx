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
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Governed records are tagged by jurisdiction and review depth. Export compliance records as PDF or CSV for audit and regulatory submission.
            </p>
          </div>
          <p className="text-sm">
            <Link href={`/dashboard/policies${q}`} style={{ color: "var(--text-muted)" }}>Policies</Link>
          </p>
        </div>
      )}
    </div>
  );
}
