"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import AppShellClient, { type AppShellWorkspaceMeta } from "./AppShellClient";

/** Static skeleton only. No dynamic data so server and client output match. */
function AppShellSkeleton() {
  const t = useTranslations("common");
  return (
    <div className="flex h-screen bg-[var(--bg-base)]" aria-busy="true" aria-label="Loading app">
      <div className="hidden md:block w-[200px] bg-[var(--bg-surface)] border-r border-[var(--border-default)] shrink-0">
        <div className="p-4 space-y-3">
          <div className="h-8 w-8 rounded-full bg-[var(--bg-card)]" />
          <div className="h-4 w-24 rounded bg-[var(--bg-card)]" />
          <div className="space-y-2 mt-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-[var(--bg-card)]" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center min-w-0">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-primary)] text-sm font-bold">
            RT
          </div>
          <p className="text-sm text-[var(--text-tertiary)]">{t("loading", { defaultValue: "Loading…" })}</p>
        </div>
      </div>
    </div>
  );
}

export type HydrationGateInitialData = {
  workspaceId: string;
  workspaceName: string;
  workspaceMeta: AppShellWorkspaceMeta;
};

export default function HydrationGate({
  initialShellData,
  children,
}: {
  initialShellData: HydrationGateInitialData;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Unregister service workers so deploys don't serve stale cached responses
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }
  }, []);
  useEffect(() => {
    // Defer so setState is not synchronous in effect (avoids lint); ensures client-only render of app.
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) {
    return <AppShellSkeleton />;
  }

  // Only render interactive app after mount. No server HTML for this subtree = no hydration mismatch.
  return (
    <AppShellClient
      initialWorkspaceId={initialShellData.workspaceId}
      initialWorkspaceName={initialShellData.workspaceName}
      initialWorkspaceMeta={initialShellData.workspaceMeta}
    >
      {children}
    </AppShellClient>
  );
}
