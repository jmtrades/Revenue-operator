"use client";

/**
 * LIMITATION: This is a client component that performs auth checks client-side.
 * Ideally, auth should be checked server-side with a redirect to /sign-in if no session.
 * Refactoring to server-side is complex due to:
 * - Multiple useEffect hooks for workspace loading, redirects, and localStorage access
 * - Dynamic path validation (ALLOWED_DASHBOARD_PATHS array)
 * - Client-side state management (WorkspaceContext)
 * - useRouter for programmatic navigation
 *
 * Current client-side redirect fallback (line 154) ensures users without workspaces
 * are redirected to /activate, maintaining security even without server-side checks.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
  Brain,
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
  "/dashboard/intelligence",
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
/* ─── Grouped navigation ─── */
interface NavGroup {
  label: string;
  items: { key: string; href: string; icon: LucideIcon }[];
}
function buildNavGroups(_t: (key: string) => string): NavGroup[] {
  return [
    {
      label: "",
      items: [
        { key: "activity", href: "/dashboard/activity", icon: LayoutList },
        { key: "contacts", href: "/dashboard/contacts", icon: Users },
        { key: "agents", href: "/dashboard/agents", icon: Bot },
        { key: "campaigns", href: "/dashboard/campaigns", icon: Megaphone },
        { key: "messages", href: "/dashboard/messages", icon: MessageSquare },
        { key: "calls", href: "/dashboard/calls", icon: PhoneCall },
      ],
    },
    {
      label: "Operations",
      items: [
        { key: "calendar", href: "/dashboard/calendar", icon: Calendar },
        { key: "followUps", href: "/dashboard/follow-ups", icon: ListTodo },
        { key: "analytics", href: "/dashboard/analytics", icon: BarChart3 },
        { key: "intelligence", href: "/dashboard/intelligence", icon: Brain },
      ],
    },
    {
      label: "Settings",
      items: [
        { key: "settings", href: "/dashboard/settings", icon: Settings },
        { key: "integrations", href: "/dashboard/integrations", icon: Plug },
        { key: "billing", href: "/dashboard/billing", icon: CreditCard },
      ],
    },
  ];
}

/* Legacy flat nav for buildNav callers (mobile, etc.) */
const NAV_KEYS = [
  "activity", "contacts", "agents", "campaigns", "messages", "calendar", "analytics", "settings",
  "start", "record", "calls", "presence", "approvals", "followUps", "escalations", "policies",
  "templates", "team", "integrations", "compliance", "import", "billing",
] as const;
const NAV_HREFS = [
  "/dashboard/activity", "/dashboard/contacts", "/dashboard/agents", "/dashboard/campaigns",
  "/dashboard/messages", "/dashboard/calendar", "/dashboard/analytics", "/dashboard/settings",
  "/dashboard/start", "/dashboard/record", "/dashboard/calls", "/dashboard/presence",
  "/dashboard/approvals", "/dashboard/follow-ups", "/dashboard/escalations", "/dashboard/policies",
  "/dashboard/templates", "/dashboard/team", "/dashboard/integrations", "/dashboard/compliance",
  "/dashboard/import", "/dashboard/billing",
];
const NAV_ICONS: (LucideIcon | undefined)[] = [
  LayoutList, Users, Bot, Megaphone, MessageSquare, Calendar, BarChart3, Settings,
  Play, FileText, PhoneCall, UserCheck, FileCheck, ListTodo, ArrowUpRight, FileStack,
  FileText, Users, Plug, Shield, Download, CreditCard,
];
function buildNav(t: (key: string) => string) {
  return NAV_HREFS.map((href, i) => ({
    href,
    label: t(`layout.navLabels.${NAV_KEYS[i]}`),
    icon: NAV_ICONS[i],
  }));
}

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
  const t = useTranslations("dashboard");
  return <LoadingScreen message={t("loadingMessage")} />;
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId, workspaces, loading, error, setWorkspaceId, retry } = useWorkspace();
  const _navItems = useMemo(() => buildNav(t), [t]);
  const navGroups = useMemo(() => buildNavGroups(t), [t]);
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
    fetch(`/api/dashboard/ping?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }).catch((e: unknown) => { console.warn("[layout] failed:", e instanceof Error ? e.message : String(e)); });
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

  // Redirect to onboarding if not yet completed (client-only).
  // Canonical onboarding is /app/onboarding as of Phase 69 — /dashboard/onboarding
  // is a legacy alias that now 301s to /app/onboarding. Skip both paths so we
  // don't ping-pong through the redirect.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || loading || workspaces.length === 0) return;
    if (pathname === "/dashboard/onboarding" || pathname === "/app/onboarding") return;
    try {
      if (!localStorage.getItem("rt_onboarded")) {
        const q = new URLSearchParams(window.location.search);
        router.replace(`/app/onboarding${q.toString() ? `?${q.toString()}` : ""}`);
      }
    } catch {
      // ignore
    }
  }, [mounted, pathname, loading, workspaces.length, router]);

  if (loading) {
    return <LoadingScreen message={t("loadingMessage")} onRetry={retry} />;
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
            Revenue Operator
          </p>
        </div>
        <WorkspaceSelect />
        <nav className="flex-1 p-3 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-4 pt-3 border-t" : ""} style={gi > 0 ? { borderColor: "var(--border)" } : undefined}>
              {group.label && (
                <p className="text-[10px] uppercase tracking-widest font-medium px-3 mb-1.5" style={{ color: "var(--text-muted)" }}>
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} href={item.href} label={t(`layout.navLabels.${item.key}`)} icon={item.icon} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <TopBar />
        <div className="shrink-0 px-4 md:px-6 py-2 border-b hidden md:block" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("layout.handlingBanner")}
          </p>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

const MOBILE_TAB_KEYS = ["activity", "contacts", "campaigns", "agents"] as const;
const MOBILE_TAB_HREFS = ["/dashboard/activity", "/dashboard/contacts", "/dashboard/campaigns", "/dashboard/agents"];
const MORE_LINK_KEYS = ["messages", "calendar", "analytics", "settings"] as const;
const MORE_LINK_HREFS = ["/dashboard/messages", "/dashboard/calendar", "/dashboard/analytics", "/dashboard/settings"];

function MobileBottomNav() {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);
  const wid = searchParams.get("workspace_id");
  const q = wid ? `?workspace_id=${encodeURIComponent(wid)}` : "";

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard/activity" && pathname.startsWith(href));

  const mobileTabs = useMemo(
    () => MOBILE_TAB_HREFS.map((href, i) => ({ href, label: t(`layout.navLabels.${MOBILE_TAB_KEYS[i]}`) })),
    [t]
  );
  const moreLinks = useMemo(
    () => MORE_LINK_HREFS.map((href, i) => ({ href, label: t(`layout.navLabels.${MORE_LINK_KEYS[i]}`) })),
    [t]
  );

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 safe-area-pb"
        style={{ borderColor: "var(--border)", borderTopWidth: "1px", background: "var(--background)" }}
        aria-label={t("layout.mobileNavAria")}
      >
        {mobileTabs.map(({ href, label }) => (
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
            <span className="text-[10px] uppercase tracking-wider">{t("layout.moreLabel")}</span>
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
                {moreLinks.map(({ href, label }) => (
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
  const t = useTranslations("dashboard");
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
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }} aria-label={t("layout.notificationsAria")}>{t("layout.notificationsAria")}</span>
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
  const t = useTranslations("dashboard");
  const router = useRouter();
  const pathname = usePathname();
  const { workspaceId, workspaces, loading, error, setWorkspaceId, retry: _retry } = useWorkspace();
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
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>{t("layout.contextLabel")}</p>
        <div className="px-3 py-2 rounded-lg text-sm" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-muted)" }}>
          {t("layout.reconnecting")}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3">
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>{t("layout.contextLabel")}</p>
        <div className="p-3 rounded-lg text-sm" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
          <p style={{ color: "var(--text-secondary)" }}>{t("layout.normalConditionsNotPresent")}</p>
        </div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="p-3">
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>{t("layout.contextLabel")}</p>
        <Link
          href="/activate"
          className="block w-full px-3 py-2 rounded-lg text-sm font-medium text-center btn-primary"
        >
          {t("layout.setUpCallHandling")}
        </Link>
      </div>
    );
  }

  return (
    <div className="p-3">
      <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>{t("layout.switchContext")}</label>
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
        active ? "bg-[var(--bg-inset)]/50" : ""
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
