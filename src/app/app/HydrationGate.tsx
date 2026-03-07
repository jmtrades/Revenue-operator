"use client";

import { useState, useEffect, type ReactNode } from "react";
import AppShellClient, { type AppShellWorkspaceMeta } from "./AppShellClient";

function AppShellSkeleton() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#080d19" }}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading app"
    >
      <div className="flex flex-1 min-h-0">
        <aside className="hidden md:flex md:w-[220px] flex-col shrink-0 bg-[#0a0f1c] border-r border-white/[0.04] animate-pulse">
          <div className="p-5 border-b border-zinc-800">
            <div className="w-8 h-8 bg-white/10 rounded-lg" />
            <div className="h-4 w-32 mt-2 bg-white/10 rounded" />
          </div>
          <div className="flex-1 p-3 space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-8 bg-white/[0.06] rounded-r-xl" />
            ))}
          </div>
        </aside>
        <main className="flex-1 overflow-auto min-w-0 flex items-center justify-center p-8" style={{ background: "#080d19" }}>
          <div className="text-center">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-black font-bold text-sm">RT</span>
            </div>
            <p className="text-sm text-white/50">Loading…</p>
          </div>
        </main>
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
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!mounted) {
    return <AppShellSkeleton />;
  }

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
