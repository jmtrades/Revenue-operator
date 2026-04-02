"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

export function RenewalReminderBanner() {
  const { workspaceId } = useWorkspace();
  const [renewalAt, setRenewalAt] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/billing/renewal?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.renewal_at) setRenewalAt(d.renewal_at);
      })
      .catch((e: unknown) => { console.warn("[RenewalReminderBanner] fetch failed:", e instanceof Error ? e.message : String(e)); });
  }, [workspaceId]);

  if (dismissed || !renewalAt || now === null) return null;
  const msUntil = new Date(renewalAt).getTime() - now;
  const hoursUntil = Math.floor(msUntil / (60 * 60 * 1000));
  if (hoursUntil > 24 || hoursUntil < 0) return null;
  const renewalDate = new Date(renewalAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="px-4 py-2 flex items-center justify-between text-sm" style={{ background: "rgba(77, 163, 255, 0.1)", borderBottom: "1px solid var(--meaning-blue)" }}>
      <span style={{ color: "var(--text-primary)" }}>
        Handling coverage continues on {renewalDate}. Pause anytime in Preferences if you need to stop.
      </span>
      <button onClick={() => setDismissed(true)} style={{ color: "var(--text-muted)" }}>×</button>
    </div>
  );
}
