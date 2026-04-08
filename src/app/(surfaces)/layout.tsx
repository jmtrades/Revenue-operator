"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { WorkspaceProvider, useWorkspace } from "@/components/WorkspaceContext";

function SurfacesShell({ children }: { children: React.ReactNode }) {
  const { workspaceId, workspaces, loading, setWorkspaceId } = useWorkspace();
  const t = useTranslations("surfaces");

  const nav = [
    { href: "/org", label: t("nav.org") },
    { href: "/solo", label: t("nav.solo") },
    { href: "/life", label: t("nav.life") },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <header className="border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-[880px] items-center justify-between gap-4">
          <nav className="flex gap-6">
            {nav.map(({ href, label }) => {
              const isActive = typeof window !== "undefined" && window.location.pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="text-[15px] transition-colors hover:opacity-90"
                  aria-current={isActive ? "page" : undefined}
                  style={{ color: "var(--text-muted)" }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          {workspaces.length > 1 && (
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="rounded-lg border px-3 py-2 text-[15px] focus-ring"
              style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
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
            <div className="flex items-center gap-3 py-8">
              <span className="inline-block h-4 w-4 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" aria-hidden />
              <p className="text-base" style={{ color: "var(--text-muted)" }}>{t("loading")}</p>
            </div>
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
