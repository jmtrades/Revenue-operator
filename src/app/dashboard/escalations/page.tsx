"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

export default function EscalationsPage() {
  const { workspaceId } = useWorkspace();
  const searchParams = useSearchParams();
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Escalations" subtitle="Active L1→L2→L3 escalations and resolution status." />
      {!workspaceId ? (
        <EmptyState icon="pulse" title="Select a context." subtitle="Escalations appear here." />
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="py-3 px-4 font-medium" style={{ color: "var(--text-muted)" }}>Record</th>
                <th className="py-3 px-4 font-medium" style={{ color: "var(--text-muted)" }}>Level</th>
                <th className="py-3 px-4 font-medium" style={{ color: "var(--text-muted)" }}>Reason</th>
                <th className="py-3 px-4 font-medium" style={{ color: "var(--text-muted)" }}>Since</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td colSpan={4} className="py-12 px-4 text-center" style={{ color: "var(--text-muted)" }}>
                  No active escalations. When records are escalated, they appear here.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-sm">
        <Link href={`/dashboard/approvals${q}`} style={{ color: "var(--text-muted)" }}>Approvals</Link>
      </p>
    </div>
  );
}
