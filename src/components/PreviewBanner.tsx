"use client";

import { useEffect, useState } from "react";

export function PreviewBanner({ workspaceId }: { workspaceId: string }) {
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      setPreviewMode(false);
      return;
    }
    fetch(`/api/workspaces/${workspaceId}/settings`)
      .then((r) => r.json())
      .then((d) => setPreviewMode(d.preview_mode ?? false))
      .catch(() => setPreviewMode(false));
  }, [workspaceId]);

  if (!previewMode) return null;

  return (
    <div className="bg-amber-600/20 border-b border-amber-600/40 px-4 py-2 text-center text-sm text-amber-200">
      <span className="font-medium">Preview Mode</span>
      {" — "}
      Your team drafts all responses but nothing is sent. For demos and trust building.
    </div>
  );
}
