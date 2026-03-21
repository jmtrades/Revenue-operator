"use client";

import { useState, useEffect } from "react";
import { fetchWorkspaceMeCached, getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";

const FALLBACK = "My Workspace";

/**
 * Resolves workspace name from the workspace API.
 */
export function WorkspaceName({
  className,
  initialName,
}: {
  className?: string;
  initialName?: string;
}) {
  const [name, setName] = useState<string | null>(() => {
    const fromServer = initialName?.trim();
    if (fromServer) return fromServer;
    const snapshot = getWorkspaceMeSnapshotSync() as
      | { name?: string | null; business_name?: string | null }
      | null;
    const businessName = snapshot?.business_name?.trim();
    const workspaceName = snapshot?.name?.trim();
    return businessName || workspaceName || null;
  });

  useEffect(() => {
    let cancelled = false;
    fetchWorkspaceMeCached()
      .then((data) => {
        if (cancelled) return null;
        return data as { name?: string | null; business_name?: string | null } | null;
      })
      .then((data: { name?: string | null; business_name?: string | null } | null) => {
        if (cancelled || data == null) return;
        const businessName = data.business_name?.trim();
        const workspaceName = data.name?.trim();
        const fromApi = businessName || workspaceName;
        if (fromApi) {
          setName(fromApi);
          return;
        }
        setName(FALLBACK);
      })
      .catch(() => {
        if (cancelled) return;
        setName(FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const display = name ?? FALLBACK;
  const isLoading = name === null;
  return (
    <span
      className={className}
      aria-label={isLoading ? "Loading workspace" : undefined}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <span className="inline-block min-w-[7rem] h-4 rounded bg-[var(--bg-inset)] animate-pulse" aria-hidden />
      ) : (
        display
      )}
    </span>
  );
}
