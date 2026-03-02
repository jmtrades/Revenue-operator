"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutList,
  Users,
  Bot,
  Megaphone,
  MessageSquare,
  Calendar,
  BarChart3,
  Settings,
  Play,
  FileText,
  PhoneCall,
  UserCheck,
  ListTodo,
  ArrowUpRight,
  FileCheck,
  FileStack,
  Shield,
  Plug,
  Download,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { WorkspaceProvider, useWorkspace } from "@/components/WorkspaceContext";
import { LoadingScreen } from "@/components/ui";

/** Operational environment: start is canonical; record/lead, preferences, connection are deep-link only. */
const ALLOWED_DASHBOARD_PATHS = [
  "/dashboard",
  "/dashboard/start",
  "/dashboard/record",
  "/dashboard/activity",
  "/dashboard/presence",
  "/dashboard/approvals",
  "/dashboard/policies",
  "/dashboard/templates",
  "/dashboard/preferences",
  "/dashboard/connection",
  "/dashboard/import",
  "/dashboard/billing",
  "/dashboard/calls",
  "/dashboard/follow-ups",
  "/dashboard/escalations",
  "/dashboard/messages",
  "/dashboard/compliance",
  "/dashboard/settings",
  "/dashboard/contacts",
  "/dashboard/calendar",
  "/dashboard/campaigns",
  "/dashboard/agents",
  "/dashboard/analytics",
  "/dashboard/team",
  "/dashboard/integrations",
  "/dashboard/onboarding",
];
function isAllowedPath(pathname: string): boolean {
  if (ALLOWED_DASHBOARD_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/dashboard/record/lead/")) return true;
  if (pathname.startsWith("/dashboard/policies/")) return true;
  if (pathname.startsWith("/dashboard/calls/")) return true;
  if (pathname.startsWith("/dashboard/messages/")) return true;
  if (pathname.startsWith("/dashboard/settings/")) return true;
  if (pathname.startsWith("/dashboard/campaigns/")) return true;
  if (pathname.startsWith("/dashboard/agents/")) return true;
  return false;
}
const NAV: { href: string; label: string; icon?: LucideIcon }[] = [
  { href: "/dashboard/activity", label: "Activity", icon: LayoutList },
  { href: "/dashboard/contacts", label: "Contacts", icon: Users },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/start", label: "Start", icon: Play },
  { href: "/dashboard/record", label: "Record", icon: FileText },
  { href: "/dashboard/calls", label: "Calls", icon: PhoneCall },
  { href: "/dashboard/presence", label: "Presence", icon: UserCheck },
  { href: "/dashboard/approvals", label: "Approvals", icon: FileCheck },
  { href: "/dashboard/follow-ups", label: "Follow-ups", icon: ListTodo },
  { href: "/dashboard/escalations", label: "Escalations", icon: ArrowUpRight },
  { href: "/dashboard/policies", label: "Policies", icon: FileStack },
  { href: "/dashboard/templates", label: "Templates", icon: FileText },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/integrations", label: "Integrations", icon: Plug },
  { href: "/dashboard/compliance", label: "Compliance", icon: Shield },
  { href: "/dashboard/import", label: "Import", icon: Download },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
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
  return <LoadingScreen message="One moment…" />;
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
    if (redirecting.current || loading || workspaces.length > 0 || error) return;
    if (!pathname.startsWith("/dashboard")) return;
    redirecting.current = true;
    router.replace("/activate");
  }, [loading, workspaces.length, error, pathname, router]);

  const allowed = isAllowedPath(pathname);
  const isLiveOrValue = pathname === "/dashboard/live" || pathname === "/dashboard/value";
  // Default app home is Activity (v9)
  useEffect(() => {
    if (pathname === "/dashboard") {
      const q = new URLSearchParams(window.location.search);
      router.replace(`/dashboard/activity${q.toString() ? `?${q.toString()}` : ""}`);
      return;
    }
    if (!pathname.startsWith("/dashboard") || allowed || isLiveOrValue) return;
    const q = new URLSearchParams(window.location.search);
    router.replace(`/dashboard/start${q.toString() ? `?${q.toString()}` : ""}`);
  }, [pathname, allowed, isLiveOrValue, router]);

  // Redirect to onboarding if not yet completed (client-only)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || pathname === "/dashboard/onboarding" || loading || workspaces.length === 0) return;
    try {
      if (!localStorage.getItem("rt_onboarded")) {
        const q = new URLSearchParams(window.location.search);
        router.replace(`/dashboard/onboarding${q.toString() ? `?${q.toString()}` : ""}`);
      }
    } catch {
      // ignore
    }
  }, [mounted, pathname, loading, workspaces.length, router]);

  if (loading) {
    return <LoadingScreen message="One moment…" onRetry={retry} />;
  }

  if (error && workspaces.length === 0) {
    return (
      <LoadingScreen
        message={error}
        onRetry={() => {
          redirecting.current = false;
          retry();
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row pb-20 md:pb-0"
      style={{ background: "var(--background)" }}
      data-operational-environment="true"
    >
      <aside
        className="hidden md:flex md:w-60 border-r flex-col shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--background)" }}
      >
        <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Recall Touch
          </p>
        </div>
        <WorkspaceSelect />
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} label={n.label} icon={n.icon} />
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <TopBar />
        <div className="shrink-0 px-4 md:px-6 py-2 border-b hidden md:block" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Handling active. Commitments secured. Compliance enforced. Confirmation recorded.
          </p>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

const MOBILE_TABS = [
  { href: "/dashboard/activity", label: "Activity" },
  { href: "/dashboard/contacts", label: "Contacts" },
  { href: "/dashboard/campaigns", label: "Campaigns" },
  { href: "/dashboard/agents", label: "Agents" },
] as const;
const MORE_LINKS = [
  { href: "/dashboard/messages", label: "Messages" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/settings", label: "Settings" },
];

function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);
  const wid = searchParams.get("workspace_id");
  const q = wid ? `?workspace_id=${encodeURIComponent(wid)}` : "";

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard/activity" && pathname.startsWith(href));

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 safe-area-pb"
        style={{ borderColor: "var(--border)", borderTopWidth: "1px", background: "var(--background)" }}
        aria-label="Mobile navigation"
      >
        {MOBILE_TABS.map(({ href, label }) => (
          <Link
            key={href}
            href={href + q}
            className="flex flex-col items-center gap-0.5 py-1 px-2 min-w-0 flex-1 text-center"
            style={{ color: isActive(href) ? "var(--text-primary)" : "var(--text-muted)", fontWeight: isActive(href) ? 500 : 400 }}
          >
            <span className="text-[10px] uppercase tracking-wider">{label}</span>
          </Link>
        ))}
        <div className="flex flex-col items-center gap-0.5 py-1 px-2 min-w-0 flex-1 text-center relative">
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className="w-full"
            style={{ color: moreOpen ? "var(--text-primary)" : "var(--text-muted)", fontWeight: moreOpen ? 500 : 400 }}
            aria-expanded={moreOpen}
            aria-haspopup="true"
          >
            <span className="text-[10px] uppercase tracking-wider">More</span>
          </button>
          {moreOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                style={{ top: 0, left: 0, right: 0, bottom: 0 }}
                aria-hidden
                onClick={() => setMoreOpen(false)}
              />
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 min-w-[160px] rounded-lg border py-2 shadow-lg"
                style={{ background: "var(--background)", borderColor: "var(--border)" }}
              >
                {MORE_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href + q}
                    onClick={() => setMoreOpen(false)}
                    className="block px-4 py-2 text-sm text-left"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </nav>
    </>
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
      <div className="flex-1 flex justify-end items-center gap-3 min-w-0">
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }} aria-label="Notifications">Notifications</span>
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
          className="block w-full px-3 py-2 rounded-lg text-sm font-medium text-center btn-primary"
        >
          Set up call handling
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

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon?: LucideIcon }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wid = searchParams.get("workspace_id");
  const active = pathname === href || (href !== "/dashboard/start" && pathname.startsWith(href));
  const to = wid ? `${href}${href.includes("?") ? "&" : "?"}workspace_id=${encodeURIComponent(wid)}` : href;
  return (
    <Link
      href={to}
      className={`flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm focus-ring transition-colors ${
        active ? "bg-zinc-800/50" : ""
      }`}
      style={{
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        fontWeight: active ? 500 : 400,
      }}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />}
      {label}
    </Link>
  );
}
