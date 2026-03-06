"use client";

import { useState, useEffect } from "react";

const FALLBACK = "My Workspace";

/**
 * Resolves workspace name from the workspace API.
 */
export function WorkspaceName({ className }: { className?: string }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/workspace/me", { credentials: "include" })
      .then((res) => {
        if (cancelled) return null;
        if (!res.ok) {
          setName(FALLBACK);
          return null;
        }
        return res.json() as Promise<{ name?: string }>;
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
