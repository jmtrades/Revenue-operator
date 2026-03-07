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
    const snapshot = getWorkspaceMeSnapshotSync() as { name?: string | null } | null;
    return snapshot?.name?.trim() || initialName?.trim() || null;
  });

  useEffect(() => {
    let cancelled = false;
    fetchWorkspaceMeCached()
      .then((data) => {
        if (cancelled) return null;
        return data as { name?: string } | null;
      })
      .then((data: { name?: string } | null) => {
        if (cancelled || data == null) return;
        const fromApi = data?.name?.trim();
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
        <span className="inline-block min-w-[7rem] h-4 rounded bg-zinc-800 animate-pulse" aria-hidden />
      ) : (
        display
      )}
    </span>
  );
}
