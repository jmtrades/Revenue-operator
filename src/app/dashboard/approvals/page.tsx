"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Shell } from "@/components/Shell";
import { DashboardExecutionStateBanner } from "@/components/ExecutionStateBanner";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface PendingItem {
  id: string;
  proposed_message: string;
  created_at: string;
  thread_id: string | null;
  conversation_id: string | null;
}

const SNIP_LEN = 90;

function snip(s: string): string {
  const t = s.trim();
  if (t.length <= SNIP_LEN) return t;
  return t.slice(0, SNIP_LEN).trim() + "…";
}

export default function ApprovalsPage() {
  const { workspaceId } = useWorkspace();
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setPending([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchWithFallback<{ pending: PendingItem[] }>(`/api/enterprise/approvals?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((res) => {
        if (res.data?.pending) setPending(res.data.pending);
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const decide = async (approvalId: string, decision: "approved" | "rejected") => {
    if (!workspaceId || acting) return;
    setActing(approvalId);
    try {
      const path = decision === "approved" ? "/api/enterprise/approvals/approve" : "/api/enterprise/approvals/reject";
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, approval_id: approvalId }),
      });
      const json = await r.json();
      if (json.ok) setPending((prev) => prev.filter((p) => p.id !== approvalId));
    } finally {
      setActing(null);
    }
  };

  if (!workspaceId) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Approvals appear when operation is in place.</p>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <DashboardExecutionStateBanner />
      <div className="max-w-2xl space-y-8">
        <h1 className="text-[21px] font-normal" style={{ color: "var(--text-primary)" }}>
          Pending approvals
        </h1>
        {pending.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            No review was required.
          </p>
        ) : (
          <ul className="space-y-6">
            {pending.map((p) => (
              <li
                key={p.id}
                className="border-t border-[#e7e5e4] pt-4 first:border-t-0 first:pt-0"
                style={{ color: "var(--text-primary)" }}
              >
                <p className="text-sm mb-2" style={{ lineHeight: 1.7 }}>
                  {snip(p.proposed_message)}
                </p>
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                  {new Date(p.created_at).toISOString().slice(0, 19).replace("T", " ")}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => decide(p.id, "approved")}
                    disabled={!!acting}
                    className="text-sm py-1 px-2 border border-[#e7e5e4] hover:bg-[#f5f5f4] disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(p.id, "rejected")}
                    disabled={!!acting}
                    className="text-sm py-1 px-2 border border-[#e7e5e4] hover:bg-[#f5f5f4] disabled:opacity-50"
                  >
                    Reject
                  </button>
                  {p.thread_id && (
                    <Link href="/dashboard/record" className="text-sm py-1 px-2 border border-[#e7e5e4] hover:bg-[#f5f5f4]">
                      Record
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
