"use client";

import { useState, useEffect } from "react";

const FALLBACK = "My Workspace";

/**
 * Resolves workspace name: (1) API / Supabase workspace (2) localStorage rt_business_name (3) "My Workspace".
 * When API returns a name, syncs it to localStorage so stale values are overwritten.
 */
export function WorkspaceName({ className }: { className?: string }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/workspace/me", { credentials: "include" })
      .then((res) => {
        if (cancelled) return null;
        // Unauthenticated (401) or any error: never show stale localStorage (e.g. "Portland Plumbing")
        if (!res.ok) {
          try {
            localStorage.removeItem("rt_business_name");
          } catch {
            // ignore
          }
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
          try {
            localStorage.setItem("rt_business_name", fromApi);
          } catch {
            // ignore
          }
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
