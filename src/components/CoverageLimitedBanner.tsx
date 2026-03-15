"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";

export function CoverageLimitedBanner() {
  const t = useTranslations("coverage");
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

  if (coverage === "full") {
    return (
      <div
        className="py-1.5 px-4 text-xs"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          borderBottomWidth: "1px",
          color: "var(--text-muted)",
        }}
      >
        <span>Coverage: Phone continuity active</span>
      </div>
    );
  }

  if (coverage !== "limited" || dismissed) return null;

  return (
    <div
      className="py-2 px-4 text-sm"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        borderBottomWidth: "1px",
        color: "var(--text-secondary)",
      }}
    >
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <span>
          {t("addNumberPrompt")}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/settings"
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--meaning-blue)", color: "#fff" }}
          >
            {t("addNumber")}
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs px-2 py-1 rounded opacity-70 hover:opacity-100"
            style={{ color: "var(--text-muted)" }}
          >
            {t("dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
