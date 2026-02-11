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
    <div className="bg-sky-950/50 border-b border-sky-800/50 px-4 py-2 flex items-center justify-between text-sm">
      <span className="text-sky-200">
        Protection renews in ~{hoursUntil}h. Ongoing work continues automatically. Pause protection anytime if you need to stop.
      </span>
      <button onClick={() => setDismissed(true)} className="text-sky-400 hover:text-sky-200">×</button>
    </div>
  );
}
