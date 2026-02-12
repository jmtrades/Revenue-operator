"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";

export function CoverageLimitedBanner() {
  const { workspaceId } = useWorkspace();
  const [coverage, setCoverage] = useState<"full" | "limited" | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspaces/${workspaceId}/phone-continuity`)
      .then((r) => r.json())
      .then((d: { coverage?: string }) => setCoverage((d?.coverage as "full" | "limited") ?? "limited"))
      .catch(() => setCoverage("limited"));
  }, [workspaceId]);

  if (coverage !== "limited" || dismissed) return null;

  return (
    <div
      className="py-2.5 px-4 text-sm"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        borderBottomWidth: "1px",
        color: "var(--text-secondary)",
      }}
    >
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <span>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>Coverage limited.</span>{" "}
          Calendar and post-call continuity active. Enable phone protection to maintain conversations on your existing number.
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/settings"
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--meaning-blue)", color: "#fff" }}
          >
            Add phone
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs px-2 py-1 rounded opacity-70 hover:opacity-100"
            style={{ color: "var(--text-muted)" }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
