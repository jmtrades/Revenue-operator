"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

export function SavedTodayBar() {
  const { workspaceId } = useWorkspace();
  const [data, setData] = useState<{
    conversations_maintained: number;
    follow_ups_recovered: number;
    attendance_protected: number;
  } | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    fetchWithFallback<{
      conversations_maintained: number;
      follow_ups_recovered: number;
      attendance_protected: number;
    }>(`/api/saved-today?workspace_id=${encodeURIComponent(workspaceId)}`, {
      cacheKey: `saved-today-${workspaceId}`,
    }).then((result) => {
      if (result.data) {
        setData(result.data);
      }
    });
  }, [workspaceId]);

  // Always show something - use cached or default values
  if (!workspaceId) return null;
  
  const displayData = data ?? {
    conversations_maintained: 0,
    follow_ups_recovered: 0,
    attendance_protected: 0,
  };

  return (
    <div
      className="px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm border-b"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <span className="font-medium" style={{ color: "var(--text-muted)" }}>Prevented today</span>
      <span style={{ color: "var(--text-secondary)" }}>Follow-through protected: {displayData.conversations_maintained}</span>
      <span style={{ color: "var(--text-secondary)" }}>Customers returned: {displayData.follow_ups_recovered}</span>
      <span style={{ color: "var(--text-secondary)" }}>Attendance protected: {displayData.attendance_protected}</span>
    </div>
  );
}
