"use client";

import Link from "next/link";
import { WorkspaceProvider, useWorkspace } from "@/components/WorkspaceContext";

const nav = [
  { href: "/org", label: "Org" },
  { href: "/solo", label: "Solo" },
  { href: "/life", label: "Life" },
];

function SurfacesShell({ children }: { children: React.ReactNode }) {
  const { workspaceId, workspaces, loading, setWorkspaceId } = useWorkspace();

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#1c1917]">
      <header className="border-b border-[#e7e5e4] px-6 py-4">
        <div className="mx-auto flex max-w-[880px] items-center justify-between gap-4">
          <nav className="flex gap-6">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[15px] text-[#78716c] hover:text-[#1c1917]"
              >
                {label}
              </Link>
            ))}
          </nav>
          {workspaces.length > 1 && (
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="rounded border border-[#e7e5e4] bg-white px-3 py-1.5 text-[15px] text-[#1c1917]"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name || w.id.slice(0, 8)}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>
      <main className="px-6 py-10">
        <div className="mx-auto max-w-[880px]">
          {loading ? (
            <p className="text-[18px] text-[#78716c]">Loading…</p>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}

export default function SurfacesLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <SurfacesShell>{children}</SurfacesShell>
    </WorkspaceProvider>
  );
}
