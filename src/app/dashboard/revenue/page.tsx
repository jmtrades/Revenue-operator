"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

const CALM_MESSAGE = "Calendar fill and return timing continue here.";
const ERROR_MESSAGE = "Normal conditions are not present.";

export default function RevenuePage() {
  const { workspaceId } = useWorkspace();
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/lifecycle-metrics?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((data) => {
        setError(!!data?.error);
      })
      .catch(() => setError(true));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--text-muted)" }}>Follow-through remains in place.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p style={{ color: "var(--meaning-red)" }}>{ERROR_MESSAGE}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <p style={{ color: "var(--text-primary)" }}>{CALM_MESSAGE}</p>
    </div>
  );
}
