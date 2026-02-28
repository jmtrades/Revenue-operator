"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

export default function FollowUpsPage() {
  const { workspaceId } = useWorkspace();
  const searchParams = useSearchParams();
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Follow-ups" subtitle="Pending follow-up actions from call commitments." />
      {!workspaceId ? (
        <EmptyState icon="pulse" title="Select a context." subtitle="Follow-up queue appears here." />
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="py-3 px-4 font-medium" style={{ color: "var(--text-muted)" }}>Contact</th>
                <th className="py-3 px-4 font-medium" style={{ color: "var(--text-muted)" }}>Due</th>
                <th className="py-3 px-4 font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <td colSpan={3} className="py-12 px-4 text-center" style={{ color: "var(--text-muted)" }}>
                  No pending follow-ups.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-sm">
        <Link href={`/dashboard/record${q}`} style={{ color: "var(--text-muted)" }}>View record</Link>
      </p>
    </div>
  );
}
