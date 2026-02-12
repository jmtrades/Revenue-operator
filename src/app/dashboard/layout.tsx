"use client";

import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { WorkspaceProvider, useWorkspace } from "@/components/WorkspaceContext";
import { LoadingScreen } from "@/components/ui";
import { TrialBanner } from "@/components/TrialBanner";
import { RenewalReminderBanner } from "@/components/RenewalReminderBanner";
import { CoverageLimitedBanner } from "@/components/CoverageLimitedBanner";
import { ConfidenceContractBanner } from "@/components/ConfidenceContractBanner";
import { ProtectionPausedBanner } from "@/components/ProtectionPausedBanner";
import { BillingFailureBanner } from "@/components/BillingFailureBanner";
import { ReassuranceAnchor } from "@/components/ReassuranceAnchor";
import { DailySummaryBanner } from "@/components/DailySummaryBanner";
import { OfflineBanner } from "@/components/OfflineBanner";
import { HeartbeatBar } from "@/components/HeartbeatBar";
import { SavedTodayBar } from "@/components/SavedTodayBar";
import { isLiveCompleted, isValueCompleted } from "@/lib/live-gate";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/conversations", label: "Conversations" },
  { href: "/dashboard/calls", label: "Calendar" },
  { href: "/dashboard/reports", label: "Outcomes" },
  { href: "/dashboard/settings", label: "Preferences" },
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
  return <LoadingScreen message="Restoring your conversations…" />;
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

  useEffect(() => {
    if (redirecting.current || loading || workspaces.length > 0) return;
    if (!pathname.startsWith("/dashboard")) return;
    if (pathname === "/dashboard/onboarding") return;
    redirecting.current = true;
    router.replace("/activate");
  }, [loading, workspaces.length, pathname, router]);

  if (loading) {
    return <LoadingScreen message="Restoring your conversations…" />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "var(--background)" }}>
      <aside className="w-full md:w-52 border-b md:border-b-0 md:border-r flex flex-col shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Revenue Continuity</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>We maintain. You take the calls.</p>
        </div>
        <WorkspaceSelect />
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href} label={n.label} />
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <HeartbeatBar />
        <SavedTodayBar />
        <OfflineBanner />
        <ReassuranceAnchor />
        <DailySummaryBanner />
        <BillingFailureBanner />
        <ProtectionPausedBanner />
        <CoverageLimitedBanner />
        <TrialBanner />
        <RenewalReminderBanner />
        <ConfidenceContractBanner />
        <LiveGate />
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}

function LiveGate() {
  const pathname = usePathname();
  const { workspaceId } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/dashboard/live" || pathname === "/dashboard/value") return;
    if (!pathname.startsWith("/dashboard")) return;
    if (pathname === "/dashboard/onboarding") return;
    if (!workspaceId) return;
    if (!isLiveCompleted(workspaceId)) {
      router.replace(`/dashboard/live?workspace_id=${encodeURIComponent(workspaceId)}`);
      return;
    }
    if (!isValueCompleted(workspaceId)) {
      router.replace(`/dashboard/value?workspace_id=${encodeURIComponent(workspaceId)}`);
    }
  }, [pathname, workspaceId, router]);

  return null;
}

function WorkspaceSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const { workspaceId, workspaces, loading, error, setWorkspaceId, retry } = useWorkspace();
  const effectiveId = workspaceId || workspaces[0]?.id || "";

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
          <p className="mb-2" style={{ color: "var(--text-secondary)" }}>Reconnecting…</p>
          <button
            type="button"
            onClick={retry}
            className="text-xs font-medium"
            style={{ color: "var(--meaning-blue)" }}
          >
            Retry
          </button>
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
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1"
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
