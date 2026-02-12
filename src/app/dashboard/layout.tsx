"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceProvider, useWorkspace } from "@/components/WorkspaceContext";
import { TrialBanner } from "@/components/TrialBanner";
import { RenewalReminderBanner } from "@/components/RenewalReminderBanner";
import { CoverageLimitedBanner } from "@/components/CoverageLimitedBanner";
import { ConfidenceContractBanner } from "@/components/ConfidenceContractBanner";
import { HeartbeatBar } from "@/components/HeartbeatBar";

const nav = [
  { href: "/dashboard", label: "Activity" },
  { href: "/dashboard/conversations", label: "Conversations" },
  { href: "/dashboard/calls", label: "Calls" },
  { href: "/dashboard/revenue", label: "Results" },
  { href: "/dashboard/reports", label: "Proof" },
  { href: "/dashboard/settings", label: "Preferences" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLivePage = pathname === "/dashboard/live";

  if (isLivePage) {
    return (
      <WorkspaceProvider>
        <div className="min-h-screen" style={{ background: "var(--background)" }}>
          {children}
        </div>
      </WorkspaceProvider>
    );
  }

  return (
    <WorkspaceProvider>
      <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
        <aside className="w-52 border-r flex flex-col shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Revenue Continuity</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>We maintain. You take the calls.</p>
          </div>
          <WorkspaceSelect />
          <nav className="flex-1 p-3 space-y-1">
            {nav.map((n) => (
              <NavLink key={n.href} href={n.href} label={n.label} />
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-auto flex flex-col">
          <HeartbeatBar />
          <CoverageLimitedBanner />
          <TrialBanner />
          <RenewalReminderBanner />
          <ConfidenceContractBanner />
          <LiveGate />
          <div className="flex-1 overflow-auto">{children}</div>
        </main>
      </div>
    </WorkspaceProvider>
  );
}

function LiveGate() {
  const pathname = usePathname();
  const { workspaceId } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/dashboard/live") return;
    if (pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/live")) {
      if (workspaceId && !isLiveCompleted(workspaceId)) {
        router.replace(`/dashboard/live?workspace_id=${encodeURIComponent(workspaceId)}`);
      }
    }
  }, [pathname, workspaceId, router]);

  return null;
}

function isLiveCompleted(wid: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const global = localStorage.getItem("revenue_live_completed");
    const workspace = wid ? localStorage.getItem(`revenue_live_workspace_${wid}`) : null;
    return global === "1" || workspace === "1";
  } catch {
    return false;
  }
}

function WorkspaceSelect() {
  const { workspaceId, workspaces, setWorkspaceId, loadWorkspaces } = useWorkspace();
  return (
    <div className="p-3">
      <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Account</label>
      <select
        value={workspaceId}
        onChange={(e) => setWorkspaceId(e.target.value)}
        onFocus={loadWorkspaces}
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1"
        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--text-primary)", borderWidth: "1px" }}
      >
        <option value="">Select where we maintain…</option>
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className="block px-3 py-2.5 rounded-lg text-sm transition-colors hover:opacity-90"
      style={{
        background: active ? "rgba(77, 163, 255, 0.12)" : "transparent",
        color: active ? "var(--meaning-blue)" : "var(--text-secondary)",
      }}
    >
      {label}
    </Link>
  );
}
