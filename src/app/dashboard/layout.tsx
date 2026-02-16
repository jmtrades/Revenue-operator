"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { WorkspaceProvider, useWorkspace } from "@/components/WorkspaceContext";
import { LoadingScreen } from "@/components/ui";

/** Operational environment: four surfaces only; record/lead, preferences, connection are deep-link only. */
const ALLOWED_DASHBOARD_PATHS = [
  "/dashboard",
  "/dashboard/record",
  "/dashboard/activity",
  "/dashboard/presence",
  "/dashboard/preferences",
  "/dashboard/connection",
];
function isAllowedPath(pathname: string): boolean {
  if (ALLOWED_DASHBOARD_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/dashboard/record/lead/")) return true;
  return false;
}
const NAV = [
  { href: "/dashboard", label: "Situation" },
  { href: "/dashboard/record", label: "Record" },
  { href: "/dashboard/activity", label: "Activity" },
  { href: "/dashboard/presence", label: "Presence" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLivePage = pathname === "/dashboard/live";
  const isValuePage = pathname === "/dashboard/value";

  if (isLivePage || isValuePage) {
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
      <Suspense fallback={<DashboardShellFallback />}>
        <DashboardShell>{children}</DashboardShell>
      </Suspense>
    </WorkspaceProvider>
  );
}

function DashboardShellFallback() {
  return <LoadingScreen message="Loading…" />;
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId, workspaces, loading, error, setWorkspaceId, retry } = useWorkspace();
  const urlWid = searchParams.get("workspace_id");
  const redirecting = useRef(false);

  useEffect(() => {
    if (urlWid && workspaces.some((w) => w.id === urlWid) && urlWid !== workspaceId) {
      setWorkspaceId(urlWid);
    }
  }, [urlWid, workspaces, workspaceId, setWorkspaceId]);

  // Record dashboard open for absence-confidence (do not send reassurance if opened in last 72h)
  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/dashboard/ping?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }).catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (redirecting.current || loading || workspaces.length > 0) return;
    if (!pathname.startsWith("/dashboard")) return;
    redirecting.current = true;
    router.replace("/activate");
  }, [loading, workspaces.length, pathname, router]);

  const allowed = isAllowedPath(pathname);
  const isLiveOrValue = pathname === "/dashboard/live" || pathname === "/dashboard/value";
  useEffect(() => {
    if (!pathname.startsWith("/dashboard") || allowed || isLiveOrValue) return;
    const q = new URLSearchParams(window.location.search);
    router.replace(`/dashboard${q.toString() ? `?${q.toString()}` : ""}`);
  }, [pathname, allowed, isLiveOrValue, router]);

  if (loading) {
    return <LoadingScreen message="Loading…" />;
  }

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: "var(--background)" }}
      data-operational-environment="true"
    >
      <aside
        className="w-full md:w-48 border-b md:border-b-0 md:border-r flex flex-col shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--background)" }}
      >
        <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Situation · Record · Activity · Presence
          </p>
        </div>
        <WorkspaceSelect />
        <nav className="flex-1 p-4 space-y-0.5">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} label={n.label} />
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <TopBar />
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}

function TopBar() {
  const { workspaceId } = useWorkspace();
  const [ambient, setAmbient] = useState<{ line: string; institutional_state: string } | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setAmbient(null);
      return;
    }
    fetch(`/api/operational/ambient-state?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d?.line != null ? setAmbient({ line: d.line, institutional_state: d.institutional_state ?? "none" }) : setAmbient(null)))
      .catch(() => setAmbient(null));
  }, [workspaceId]);

  return (
    <header
      className="shrink-0 flex items-center justify-between gap-4 px-6 py-4 border-b"
      style={{ borderColor: "var(--border)", background: "var(--background)" }}
    >
      <div className="flex-1 min-w-0" />
      <p
        className="flex-shrink-0 text-sm truncate max-w-md text-center"
        style={{ color: "var(--text-secondary)" }}
      >
        {ambient?.line ?? "—"}
      </p>
      <div className="flex-1 flex justify-end min-w-0">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{
            background:
              ambient?.institutional_state && ambient.institutional_state !== "none"
                ? "var(--meaning-blue)"
                : "var(--text-muted)",
          }}
          aria-hidden
        />
      </div>
    </header>
  );
}


function WorkspaceSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const { workspaceId, workspaces, loading, error, setWorkspaceId, retry } = useWorkspace();
  const effectiveId = workspaceId || (workspaces.length > 0 ? workspaces[0]?.id : "") || "";

  const handleChange = (id: string) => {
    setWorkspaceId(id);
    const params = new URLSearchParams(window.location.search);
    params.set("workspace_id", id);
    router.replace(`${pathname}?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="p-3">
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Context</p>
        <div className="px-3 py-2 rounded-lg text-sm" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-muted)" }}>
          Reconnecting…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3">
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Context</p>
        <div className="p-3 rounded-lg text-sm" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
          <p style={{ color: "var(--text-secondary)" }}>Normal conditions are not present.</p>
        </div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="p-3">
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Context</p>
        <Link
          href="/activate"
          className="block w-full px-3 py-2 rounded-lg text-sm font-medium text-center"
          style={{ background: "var(--meaning-amber)", color: "#0E1116" }}
        >
          Start protection
        </Link>
      </div>
    );
  }

  return (
    <div className="p-3">
      <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Switch context</label>
      <select
        value={effectiveId}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm focus-ring"
        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--text-primary)", borderWidth: "1px" }}
      >
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wid = searchParams.get("workspace_id");
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  const to = wid ? `${href}${href.includes("?") ? "&" : "?"}workspace_id=${encodeURIComponent(wid)}` : href;
  return (
    <Link
      href={to}
      className="block py-2.5 text-sm focus-ring"
      style={{
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        fontWeight: active ? 500 : 400,
      }}
    >
      {label}
    </Link>
  );
}
