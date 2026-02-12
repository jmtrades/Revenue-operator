"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

export function RenewalReminderBanner() {
  const { workspaceId } = useWorkspace();
  const [renewalAt, setRenewalAt] = useState<string | null>(null);
  const [hoursUntil, setHoursUntil] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/billing/renewal?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.renewal_at) {
          setRenewalAt(d.renewal_at);
          const ms = new Date(d.renewal_at).getTime() - Date.now();
          setHoursUntil(Math.floor(ms / (60 * 60 * 1000)));
        }
      })
      .catch(() => {});
  }, [workspaceId]);

  if (dismissed || !renewalAt || hoursUntil == null) return null;
  if (hoursUntil > 24 || hoursUntil < 0) return null;

  return (
    <div className="px-4 py-2 flex items-center justify-between text-sm" style={{ background: "rgba(77, 163, 255, 0.1)", borderBottom: "1px solid var(--meaning-blue)" }}>
      <span style={{ color: "var(--text-primary)" }}>
        Protection renews in ~{hoursUntil}h. We continue automatically. Pause anytime if you need to stop.
      </span>
      <button onClick={() => setDismissed(true)} style={{ color: "var(--text-muted)" }}>×</button>
    </div>
  );
}
