"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkspaceProvider, useWorkspace } from "@/components/WorkspaceContext";
import { TrialBanner } from "@/components/TrialBanner";

const nav = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/calls", label: "Calls" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <div className="min-h-screen bg-stone-950 flex">
        <aside className="w-52 border-r border-stone-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-stone-800">
            <h1 className="text-lg font-semibold text-stone-50">Revenue Operator</h1>
            <p className="text-xs text-stone-500 mt-0.5">Automatic follow-up</p>
          </div>
          <WorkspaceSelect />
          <nav className="flex-1 p-2 space-y-0.5">
            {nav.map((n) => (
              <NavLink key={n.href} href={n.href} label={n.label} />
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-auto flex flex-col">
          <TrialBanner />
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
      <label className="block text-xs font-medium text-stone-400 mb-1">Account</label>
      <select
        value={workspaceId}
        onChange={(e) => setWorkspaceId(e.target.value)}
        onFocus={loadWorkspaces}
        className="w-full px-2 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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
      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-amber-600/20 text-amber-400" : "text-stone-400 hover:bg-stone-800/80 hover:text-stone-200"
      }`}
    >
      {label}
    </Link>
  );
}
