"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkspaceProvider, useWorkspace } from "@/components/WorkspaceContext";
import { TrialBanner } from "@/components/TrialBanner";
import { RenewalReminderBanner } from "@/components/RenewalReminderBanner";
import { CoverageLimitedBanner } from "@/components/CoverageLimitedBanner";
import { ConfidenceContractBanner } from "@/components/ConfidenceContractBanner";
import { FirstVisitOverlay } from "@/components/FirstVisitOverlay";
import { HeartbeatBar } from "@/components/HeartbeatBar";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/conversations", label: "Conversations" },
  { href: "/dashboard/calls", label: "Calendar" },
  { href: "/dashboard/revenue", label: "Performance" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
        <aside className="w-52 border-r flex flex-col shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Revenue supervision</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Your conversations are being watched over</p>
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
          <FirstVisitOverlay />
          <div className="flex-1 overflow-auto">{children}</div>
        </main>
      </div>
    </WorkspaceProvider>
  );
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
        <option value="">Select account…</option>
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
