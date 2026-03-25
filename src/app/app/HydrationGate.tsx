"use client";

import { useEffect, type ReactNode } from "react";
import AppShellClient, { type AppShellWorkspaceMeta } from "./AppShellClient";

export type HydrationGateInitialData = {
  workspaceId: string;
  workspaceName: string;
  workspaceMeta: AppShellWorkspaceMeta;
};

/**
 * HydrationGate — thin wrapper that renders AppShellClient directly.
 *
 * Previous implementation deferred rendering behind a `mounted` state gate
 * (showing a skeleton until a useEffect fired). This caused infinite "Loading
 * app" screens when React's selective hydration silently failed to reach the
 * component. Rendering AppShellClient directly avoids the dead-end and lets
 * Next.js error boundaries surface real issues.
 */
export default function HydrationGate({
  initialShellData,
  children,
}: {
  initialShellData: HydrationGateInitialData;
  children: ReactNode;
}) {
  useEffect(() => {
    // Unregister service workers so deploys don't serve stale cached responses
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }
  }, []);

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
