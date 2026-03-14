"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  Link2,
  Megaphone,
  Phone,
  Settings,
  UserPlus,
  Video,
} from "lucide-react";
import {
  fetchWorkspaceMeCached,
  getWorkspaceMeSnapshotSync,
} from "@/lib/client/workspace-me";
import { apiFetch, ApiError } from "@/lib/api";
import { calculateReadiness } from "@/lib/readiness";
import { Skeleton } from "@/components/ui/Skeleton";
import { getClientOrNull } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { KPIRow } from "@/components/ui/KPIRow";
import { Timeline } from "@/components/ui/Timeline";
import { useWorkspace } from "@/components/WorkspaceContext";
import { UpgradeBanner } from "@/components/ui/UpgradeBanner";
import { Confetti } from "@/components/Confetti";

type ActivityType = "lead" | "appointment" | "follow-up" | "urgent";

type ActivityCard = {
  id: string;
  type: ActivityType;
  name: string;
  time: string;
  duration: string;
  summary: string;
  score: number | null;
};

const TYPE_COLORS: Record<ActivityType, string> = {
  lead: "#3B82F6",
  appointment: "#22C55E",
  "follow-up": "#A855F7",
  urgent: "#EF4444",
};

type FilterId = "all" | "needs_action" | "leads" | "appointments" | "urgent";

const getFilters = (t: (k: string) => string) => [
  { id: "all" as const, label: t("dashboard.filters.all") },
  { id: "needs_action" as const, label: t("dashboard.filters.needsAction") },
  { id: "leads" as const, label: t("dashboard.filters.leads") },
  { id: "appointments" as const, label: t("dashboard.filters.appointments") },
  { id: "urgent" as const, label: t("dashboard.filters.urgent") },
];

interface CallRecord {
  id: string;
  call_started_at?: string | null;
  call_ended_at?: string | null;
  outcome?: string | null;
  matched_lead?: { name?: string | null; email?: string | null; company?: string | null } | null;
  summary?: string | null;
  analysis_outcome?: unknown;
}

function _getPlaySummary(card: ActivityCard): string {
  const name = card.name;
  const summary = card.summary;
  if (card.type === "lead") {
    return `${name} called. ${summary}. Lead qualified${card.score != null ? `, score ${card.score}` : ""}. Call ended.`;
  }
  if (card.type === "appointment") {
    return `${name} called. ${summary}. Appointment confirmed. Call ended.`;
  }
  if (card.type === "follow-up") {
    return `${name} — ${summary}. Follow-up completed. Call ended.`;
  }
  if (card.type === "urgent") {
    return `Emergency call from ${name}. ${summary}. Owner alerted. Call ended.`;
  }
  return `${name} — ${summary}. Call ended.`;
}

function formatTimeLabel(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return "—";
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const sec = Math.max(0, Math.floor((e - s) / 1000));
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

const getProgressLabels = (t: (k: string) => string): Record<string, string> => ({
  business: t("dashboard.progress.setupBusinessProfile"),
  agent: t("dashboard.progress.configureAgent"),
  phone: t("dashboard.progress.connectPhone"),
  test_call: t("dashboard.progress.testCall"),
  contacts: t("dashboard.progress.importContacts"),
  calendar: t("dashboard.progress.setupCalendar"),
  campaign: t("dashboard.progress.launchCampaign"),
  team: t("dashboard.progress.inviteTeam"),
  services: t("dashboard.progress.servicesConfigured"),
  first_call: t("dashboard.progress.captureFirstLead"),
  use_cases: t("dashboard.progress.useCasesSelected"),
  voice: t("dashboard.progress.voiceSelected"),
  greeting: t("dashboard.progress.openingGreetingSet"),
  knowledge: t("dashboard.progress.addKnowledge"),
  behavior: t("dashboard.progress.behaviorConfigured"),
  tested: t("dashboard.progress.agentTested"),
  launched: t("dashboard.progress.agentLaunched"),
});

function ActivityDateLabel() {
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDateLabel(
        new Date().toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      );
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  return <span className="text-xs text-[var(--text-tertiary)]">{dateLabel}</span>;
}

const ACTIVITY_SNAPSHOT_KEY = "rt_activity_snapshot";

function readActivitySnapshot(): ActivityCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACTIVITY_SNAPSHOT_KEY);
    const parsed = raw ? (JSON.parse(raw) as ActivityCard[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistActivitySnapshot(cards: ActivityCard[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVITY_SNAPSHOT_KEY, JSON.stringify(cards));
  } catch {
    // ignore persistence errors
  }
}

const getPlaceholderArea = (t: (k: string) => string) =>
  Array.from({ length: 7 }, (_, i) => ({
    day: t(["dashboard.dayLabels.sun", "dashboard.dayLabels.mon", "dashboard.dayLabels.tue", "dashboard.dayLabels.wed", "dashboard.dayLabels.thu", "dashboard.dayLabels.fri", "dashboard.dayLabels.sat"][i]!),
    calls: 0,
  }));

const getPlaceholderPie = (t: (k: string) => string) => [
  { name: t("dashboard.noData"), value: 1 },
];

const PIE_COLORS = ["#2A2A2D"];
const REAL_PIE_COLORS = ["#00D4AA", "#FF4D4D", "#FFB224", "#4F8CFF"];

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <Skeleton variant="text" className="h-8 w-64" />
        <Skeleton variant="text" className="h-4 w-40" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
           
          <Skeleton key={i} variant="card" className="h-24" />
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
           
          <Skeleton key={i} variant="card" className="h-20" />
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton variant="card" className="h-64" />
        <Skeleton variant="card" className="h-64" />
      </div>
    </div>
  );
}

export default function AppActivityPage() {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as
    | {
        systemEvents?: Array<{ id: string; title: string; body: string; href: string }>;
        progress?: { nextStep?: { href?: string } | null };
        stats?: { calls?: number; leads?: number; estRevenue?: number; lastCallAt?: string | null };
      }
    | null;

  useEffect(() => {
    document.title = t("dashboard.pageTitle");
    return () => { document.title = ""; };
  }, [t]);
  const quickActions = useMemo(
    () => [
      { icon: Phone, label: t("dashboard.quickActions.testCall"), href: "/app/agents", desc: t("dashboard.quickActions.testCallDesc") },
      { icon: UserPlus, label: t("dashboard.addLead"), href: "/app/leads", desc: t("dashboard.quickActions.addLeadDesc") },
      { icon: Megaphone, label: t("dashboard.quickActions.createCampaign"), href: "/app/campaigns", desc: t("dashboard.quickActions.createCampaignDesc") },
      { icon: Settings, label: t("dashboard.quickActions.agentSettings"), href: "/app/agents", desc: t("dashboard.quickActions.agentSettingsDesc") },
      { icon: Link2, label: t("dashboard.quickActions.connectCrm"), href: "/app/settings/integrations", desc: t("dashboard.quickActions.connectCrmDesc") },
      { icon: BarChart3, label: t("dashboard.quickActions.viewAnalytics"), href: "/app/analytics", desc: t("dashboard.quickActions.viewAnalyticsDesc") },
    ],
    [t],
  );
  const filters = useMemo(() => getFilters(t), [t]);
  const progressLabels = useMemo(() => getProgressLabels(t), [t]);
  const placeholderArea = useMemo(() => getPlaceholderArea(t), [t]);
  const placeholderPie = useMemo(() => getPlaceholderPie(t), [t]);
  const [filter, setFilter] = useState<FilterId>("all");
  const [_playingId, _setPlayingId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<ActivityCard | null>(null);
  const [cards, setCards] = useState<ActivityCard[]>(() => readActivitySnapshot());
  const [loading, setLoading] = useState(() => readActivitySnapshot().length === 0);
  const [loadError, setLoadError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [systemEvents, setSystemEvents] = useState<Array<{ id: string; title: string; body: string; href: string }>>(
    () => workspaceSnapshot?.systemEvents ?? [],
  );
  const [welcomeToast, setWelcomeToast] = useState<string | null>(null);
  const [showFirstWelcome, setShowFirstWelcome] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("rt_dashboard_welcome_dismissed") !== "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const welcome = searchParams.get("welcome");
    if (welcome && typeof welcome === "string") {
      const message = t("dashboard.welcomeMessage", { name: decodeURIComponent(welcome) });
      const url = new URL(window.location.href);
      url.searchParams.delete("welcome");
      window.history.replaceState({}, "", url.pathname + url.search);
      queueMicrotask(() => setWelcomeToast(message));
      const id = setTimeout(() => setWelcomeToast(null), 4000);
      return () => clearTimeout(id);
    }
  }, [searchParams, t]);
  const [nextStepHref, setNextStepHref] = useState(
    () => (workspaceSnapshot as { progress?: { nextStep?: { href?: string } } } | null)?.progress?.nextStep?.href || "/app/settings/phone",
  );
  const [_agents, setAgents] = useState<Array<{ id: string; name?: string | null; voice_id?: string | null; greeting?: string | null; knowledge_base?: { faq?: Array<{ q?: string; a?: string }> }; rules?: { alwaysTransfer?: unknown[]; neverSay?: unknown[] }; vapi_agent_id?: string | null; tested_at?: string | null }>>([]);
  const [readiness, setReadiness] = useState<ReturnType<typeof calculateReadiness> | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(() =>
    workspaceSnapshot?.stats?.lastCallAt ? Date.now() : null,
  );
  const [workspaceStats, setWorkspaceStats] = useState<{
    calls: number;
    leads: number;
    estRevenue: number;
    lastCallAt?: string | null;
  }>(() => ({
    calls: workspaceSnapshot?.stats?.calls ?? 0,
    leads: workspaceSnapshot?.stats?.leads ?? 0,
    estRevenue: workspaceSnapshot?.stats?.estRevenue ?? 0,
    lastCallAt: workspaceSnapshot?.stats?.lastCallAt ?? null,
  }));
  const [callVolumeData, setCallVolumeData] = useState<{ day: string; calls: number }[]>([]);
  const [outcomeData, setOutcomeData] = useState<{ name: string; value: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityCard[]>(() => readActivitySnapshot());

  useEffect(() => {
    if (!workspaceId) return;
    apiFetch<{ calls?: CallRecord[] }>(
      `/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`,
      { credentials: "include", timeout: 8000, retries: 1 },
    )
      .then((data) => {
        setLoadError(false);
        const calls = (data.calls ?? []).slice(0, 20);
        const mapped: ActivityCard[] = calls.map((c) => {
          const name =
            c.matched_lead?.name ??
            c.matched_lead?.company ??
            c.matched_lead?.email ??
            "Caller";
          const time = formatTimeLabel(c.call_started_at);
          const duration = formatDuration(c.call_started_at, c.call_ended_at);
          const summary =
            c.summary ??
            (c.outcome === "appointment"
              ? t("dashboard.summaryBooked")
              : c.outcome === "lead"
                ? t("dashboard.summaryLead")
                : t("dashboard.summaryHandled"));
          const type: ActivityType =
            c.outcome === "appointment"
              ? "appointment"
              : c.outcome === "lead"
                ? "lead"
                : c.outcome === "transfer"
                  ? "urgent"
                  : "follow-up";
          const score =
            type === "lead"
              ? 60 + ((name.length * 7) % 40)
              : null;
          return {
            id: c.id,
            type,
            name,
            time,
            duration,
            summary,
            score,
          };
        });
        setCards(mapped);
        setRecentActivity(mapped);
        persistActivitySnapshot(mapped);

        const dayLabels = [
          t("dashboard.days.sun"),
          t("dashboard.days.mon"),
          t("dashboard.days.tue"),
          t("dashboard.days.wed"),
          t("dashboard.days.thu"),
          t("dashboard.days.fri"),
          t("dashboard.days.sat"),
        ];
        const volumeMap = new Map<string, number>();
        dayLabels.forEach((d) => volumeMap.set(d, 0));
        calls.forEach((c) => {
          const ts = c.call_started_at ?? c.call_ended_at ?? null;
          if (!ts) return;
          const d = new Date(ts);
          if (Number.isNaN(d.getTime())) return;
          const label = dayLabels[d.getDay()];
          volumeMap.set(label, (volumeMap.get(label) ?? 0) + 1);
        });
        setCallVolumeData(
          dayLabels.map((d) => ({
            day: d,
            calls: volumeMap.get(d) ?? 0,
          })),
        );

        const outcomeCounts: Record<string, number> = {
          appointment: 0,
          lead: 0,
          transfer: 0,
          other: 0,
        };
        calls.forEach((c) => {
          const o = c.outcome ?? "other";
          if (o === "appointment" || o === "lead" || o === "transfer") {
            outcomeCounts[o] += 1;
          } else {
            outcomeCounts.other += 1;
          }
        });
        const nextOutcomeData: { name: string; value: number }[] = [];
        if (outcomeCounts.lead > 0) nextOutcomeData.push({ name: t("dashboard.outcomesLeads"), value: outcomeCounts.lead });
        if (outcomeCounts.appointment > 0)
          nextOutcomeData.push({ name: t("dashboard.outcomesAppointments"), value: outcomeCounts.appointment });
        if (outcomeCounts.transfer > 0)
          nextOutcomeData.push({ name: t("dashboard.outcomesTransfers"), value: outcomeCounts.transfer });
        if (outcomeCounts.other > 0)
          nextOutcomeData.push({ name: t("dashboard.outcomesOther"), value: outcomeCounts.other });
        setOutcomeData(nextOutcomeData);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 408) {
          setLoadError(true);
        } else {
          setLoadError(true);
        }
      })
      .finally(() => setLoading(false));
  }, [workspaceId, refreshKey, t]);

  useEffect(() => {
    const client = getClientOrNull?.() ?? null;
    if (!client) return;
    const channel = client
      .channel("dashboard-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_sessions",
        },
        (payload: { new?: { id: string; caller_name?: string | null; call_started_at?: string | null; call_ended_at?: string | null; outcome?: string | null } }) => {
          const row = payload.new;
          if (!row) return;
          const time = formatTimeLabel(row.call_started_at ?? null);
          const duration = formatDuration(row.call_started_at ?? null, row.call_ended_at ?? null);
          const type: ActivityType =
            row.outcome === "appointment"
              ? "appointment"
              : row.outcome === "lead"
                ? "lead"
                : row.outcome === "transfer"
                  ? "urgent"
                  : "follow-up";
          const card: ActivityCard = {
            id: row.id,
            type,
            name: row.caller_name || "Caller",
            time,
            duration,
            summary:
              row.outcome === "appointment"
                ? t("dashboard.summaryBooked")
                : row.outcome === "lead"
                  ? t("dashboard.summaryLead")
                  : t("dashboard.summaryHandled"),
            score: type === "lead" ? 75 : null,
          };
          setRecentActivity((prev) => {
            const next = [card, ...prev];
            persistActivitySnapshot(next.slice(0, 20));
            return next.slice(0, 20);
          });
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [t]);

  useEffect(() => {
    fetchWorkspaceMeCached()
      .then((data: {
        name?: string;
        systemEvents?: Array<{ id: string; title: string; body: string; href: string }>;
        progress?: { nextStep?: { href?: string } | null; items?: Array<{ key: string; completed?: boolean }> };
        stats?: { calls?: number; leads?: number; estRevenue?: number; lastCallAt?: string | null };
      } | null) => {
        setSystemEvents(data?.systemEvents ?? []);
        setNextStepHref(data?.progress?.nextStep?.href || "/app/settings/phone");
        setWorkspaceStats({
          calls: data?.stats?.calls ?? 0,
          leads: data?.stats?.leads ?? 0,
          estRevenue: data?.stats?.estRevenue ?? 0,
          lastCallAt: data?.stats?.lastCallAt ?? null,
        });
        setLastCheckedAt(Date.now());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/agents?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.resolve({ agents: [] })))
      .then((data: { agents?: unknown[] }) => {
        const list = data?.agents ?? [];
        setAgents(list as typeof _agents);
        const snapshot = getWorkspaceMeSnapshotSync() as { name?: string; progress?: { items?: Array<{ key: string; completed?: boolean }> } } | null;
        const phoneConnected = snapshot?.progress?.items?.find((i) => i.key === "phone")?.completed ?? false;
        const workspaceForReadiness = {
          name: snapshot?.name ?? null,
          phoneConnected,
        };
        setReadiness(calculateReadiness(workspaceForReadiness, (list as typeof _agents)[0] ?? null));
      })
      .catch(() => setReadiness(null));
  }, [workspaceId]);

  let showInactivityBanner = false;
  if (workspaceStats.lastCallAt && lastCheckedAt != null) {
    const last = new Date(workspaceStats.lastCallAt).getTime();
    if (!Number.isNaN(last) && lastCheckedAt - last > 3 * 24 * 60 * 60 * 1000) {
      showInactivityBanner = true;
    }
  }

  const _filtered = useMemo(() => {
    if (filter === "all") return cards;
    if (filter === "leads") return cards.filter((c) => c.type === "lead");
    if (filter === "appointments")
      return cards.filter((c) => c.type === "appointment");
    if (filter === "urgent") return cards.filter((c) => c.type === "urgent");
    if (filter === "needs_action")
      return cards.filter(
        (c) => c.type === "lead" || c.type === "urgent",
      );
    return cards;
  }, [cards, filter]);

  const fallbackProgressItems =
    (workspaceSnapshot as { progress?: { items?: Array<{ key: string; completed: boolean }> } } | null)?.progress
      ?.items ?? [];
  const fallbackPct =
    fallbackProgressItems.length === 0
      ? 0
      : Math.round((fallbackProgressItems.filter((p) => p.completed).length / fallbackProgressItems.length) * 100);
  const progressItems =
    readiness?.items ??
    fallbackProgressItems.map((p) => ({
      ...p,
      label: progressLabels[p.key] ?? p.key,
      href: "/app/settings/phone",
      weight: 0,
    }));
  const serverProgressItems =
    (workspaceSnapshot as { progress?: { items?: Array<{ key: string; completed?: boolean; label?: string; href?: string }> } } | null)?.progress?.items ?? [];
  const useServerChecklist = serverProgressItems.length >= 8;
  const progressItemsResolved = useServerChecklist
    ? serverProgressItems.map((p) => ({
        key: p.key,
        completed: p.completed ?? false,
        label: p.label ?? progressLabels[p.key] ?? p.key,
        href: p.href ?? "/app/settings/phone",
      }))
    : progressItems;
  const progressPct =
    progressItemsResolved.length > 0
      ? Math.round(
          (progressItemsResolved.filter((p) =>
            "completed" in p ? p.completed : (p as { done?: boolean }).done
          ).length /
            progressItemsResolved.length) *
            100
        )
      : readiness
        ? readiness.percentage
        : fallbackPct;
  const continueSetupHref =
    (progressItemsResolved.find((p) =>
      !("completed" in p ? p.completed : (p as { done?: boolean }).done)
    ) as { href?: string } | undefined)?.href ??
    readiness?.nextAction?.href ??
    nextStepHref ??
    "/app/settings/phone";

  const totalSteps = progressItemsResolved.length;
  const completedSteps = progressItemsResolved.filter((p) =>
    "completed" in p ? p.completed : (p as { done?: boolean }).done
  ).length;

  const callCount = workspaceStats.calls || cards.length;
  const leadCount = workspaceStats.leads || cards.filter((c) => c.type === "lead").length;
  const estRevenue = workspaceStats.estRevenue || leadCount * 800;
  const answeredCalls = cards.filter(
    (c) => c.type === "lead" || c.type === "appointment" || c.type === "follow-up" || c.type === "urgent",
  ).length;
  const answerRate =
    callCount > 0 ? Math.round((answeredCalls / callCount) * 100) : 0;

  const phoneConnected =
    progressItemsResolved.some((p) =>
      p.key === "phone" && ("completed" in p ? p.completed : (p as { done?: boolean }).done)
    ) ||
    Boolean(
      (workspaceSnapshot as
        | { progress?: { items?: Array<{ key: string; completed?: boolean }> } }
        | null)?.progress?.items?.find((i) => i.key === "phone")?.completed,
    );

  const hasAnyCalls =
    (workspaceStats.calls ?? 0) > 0 ||
    cards.length > 0 ||
    Boolean(workspaceStats.lastCallAt);

  useEffect(() => {
    if (!showFirstWelcome) return;
    if (!hasAnyCalls) return;
    try {
      window.localStorage.setItem("rt_dashboard_welcome_dismissed", "true");
    } catch {
      // ignore
    }
    const id = setTimeout(() => setShowFirstWelcome(false), 0);
    return () => clearTimeout(id);
  }, [hasAnyCalls, showFirstWelcome]);

  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("rt_activity_checklist_dismissed") === "true";
    } catch {
      return false;
    }
  });
  const [showChecklistConfetti, setShowChecklistConfetti] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "rt_activity_checklist_dismissed",
        checklistDismissed ? "true" : "false",
      );
    } catch {
      // ignore
    }
  }, [checklistDismissed]);

  useEffect(() => {
    if (totalSteps < 8 || completedSteps !== totalSteps || checklistDismissed) return;
    const t1 = setTimeout(() => setShowChecklistConfetti(true), 0);
    const t2 = setTimeout(() => {
      setShowChecklistConfetti(false);
      setChecklistDismissed(true);
    }, 3500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [totalSteps, completedSteps, checklistDismissed]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.greetingMorning");
    if (hour < 18) return t("dashboard.greetingAfternoon");
    return t("dashboard.greetingEvening");
  }, [t]);

  const needsAttention = useMemo(() => {
    const items: { id: string; label: string; tone: "red" | "amber" | "green" }[] = [];
    for (const c of cards.slice(0, 10)) {
      if (c.type === "urgent") {
        items.push({
          id: `urgent-${c.id}`,
          label: t("dashboard.needsFollowUp", { name: c.name }),
          tone: "red",
        });
      } else if (c.type === "lead") {
        items.push({
          id: `lead-${c.id}`,
          label: t("dashboard.newLeadReview", { name: c.name }),
          tone: "amber",
        });
      }
    }
    return items;
  }, [cards, t]);

  return (
    <div className="max-w-[960px] mx-auto p-4 md:p-6 space-y-6">
      {showChecklistConfetti && <Confetti key="checklist-100-confetti" />}
      {welcomeToast && (
        <div role="status" aria-live="polite" className="fixed right-4 top-4 z-50 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card-elevated)] px-4 py-2.5 text-sm text-[var(--text-primary)] shadow-lg">
          {welcomeToast}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {greeting}.
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("dashboard.todaySummary")}
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1">
          <ActivityDateLabel />
        </div>
      </div>

      {showFirstWelcome && !hasAnyCalls && (
        <div className="mt-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {t("dashboard.heroHeading")}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {t("dashboard.heroDescription")}
          </p>
        </div>
      )}

      <KPIRow>
        <StatCard
          label={t("dashboard.kpis.callsHandled")}
          value={callCount}
          prefix=""
          suffix=""
          trend={0}
        />
        <StatCard
          label={t("dashboard.kpis.answerRate")}
          value={answerRate}
          suffix="%"
          trend={0}
        />
        <StatCard
          label={t("dashboard.kpis.leadsCreated")}
          value={leadCount}
          suffix=""
          trend={0}
        />
        <StatCard
          label={t("dashboard.kpis.revenueProtected")}
          value={estRevenue}
          prefix="$"
          trend={0}
        />
      </KPIRow>

      <UpgradeBanner
        title={t("dashboard.readyForVolume")}
        description={t("dashboard.readyForVolumeDesc")}
        ctaLabel={t("dashboard.viewPlans")}
        href="/app/settings/billing"
      />

      {showInactivityBanner && (
        <div className="mb-4 p-4 rounded-xl border border-[var(--accent-amber)]/30 bg-[var(--accent-amber)]/10">
          <p className="text-sm text-[var(--text-primary)]">
            {t("dashboard.noCallsWarning")}
          </p>
          <Link
            href="/app/settings/phone"
            className="inline-block mt-2 text-xs font-medium text-[var(--accent-amber)] hover:opacity-90 underline"
          >
            {t("dashboard.checkSetup")} →
          </Link>
        </div>
      )}

      {!checklistDismissed && (progressPct < 100 || completedSteps < totalSteps) && (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {t("dashboard.setupChecklist")}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {t("dashboard.setupProgress", { pct: progressPct })}
              </p>
              {totalSteps > 0 && (
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                  {t("dashboard.stepsComplete", { done: completedSteps, total: totalSteps })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setChecklistDismissed(true)}
              className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              {t("dashboard.skipSetup")}
            </button>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-input)]">
            <div
              className="h-full rounded-full bg-[var(--accent-green)] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {progressItemsResolved.map((item) => {
              const done = "completed" in item ? item.completed : (item as { done?: boolean }).done;
              const label = (item as { label?: string }).label ?? progressLabels[item.key] ?? item.key;
              const href = (item as { href?: string }).href ?? "/app/settings/phone";
              return (
                <div key={item.key} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-[var(--accent-green)] shrink-0" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-[var(--border-medium)] shrink-0" />
                    )}
                    <span
                      className={
                        done
                          ? "text-[var(--text-secondary)] text-xs"
                          : "text-[var(--text-primary)] text-xs"
                      }
                    >
                      {label}
                    </span>
                  </div>
                  {!done && (
                    <Link
                      href={href}
                      className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
                    >
                      {t("dashboard.openStep")}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
          <Link
            href={continueSetupHref}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black hover:bg-zinc-100 transition-colors"
          >
            {t("dashboard.continueSetup")} →
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
        {quickActions.map((a) => (
          <motion.div
            key={a.href}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <Link
              href={a.href}
              className="bg-[#111113] border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-white/20 hover:bg-[#1A1A1D] transition-colors duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:bg-white/10 transition-colors">
                <a.icon className="w-5 h-5 text-[#8B8B8D] group-hover:text-[#EDEDEF] transition-colors" />
              </div>
              <p className="text-sm font-medium text-[#EDEDEF]">{a.label}</p>
              <p className="text-xs text-[#5A5A5C] mt-0.5">{a.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label={t("filter.activity")}>
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.id
                ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="rounded-xl border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-4 mb-4" role="alert">
          <p className="text-sm text-[var(--text-primary)]">{t("dashboard.loadError.message")}</p>
          <button
            type="button"
            onClick={() => { setLoadError(false); setLoading(true); setRefreshKey((k) => k + 1); }}
            className="mt-3 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-900 hover:bg-gray-100"
            aria-label={t("dashboard.loadError.retryAria")}
          >
            {t("dashboard.loadError.retry")}
          </button>
        </div>
      )}
      {loading && cards.length === 0 && !loadError && <DashboardSkeleton />}

      {cards.length === 0 && !loading && !phoneConnected ? (
        <div className="space-y-6">
          <div>
            <p className="text-base font-medium text-[var(--text-primary)] mb-3">{t("dashboard.activity.title")}</p>
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
              <EmptyState
                icon={Phone}
                title={t("dashboard.agentReady.title")}
                description={t("dashboard.agentReady.description")}
                primaryAction={{ label: t("dashboard.agentReady.connectPhone"), href: "/app/settings/phone" }}
                secondaryAction={{ label: t("dashboard.quickActions.testCall"), href: "/app/agents" }}
                footnote={t("dashboard.agentReady.footnote")}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("dashboard.nextActions.title")}</p>
            <div className="mt-3 space-y-3">
              {[
                { title: t("dashboard.nextActions.connectPhone.title"), body: t("dashboard.nextActions.connectPhone.body"), href: "/app/settings/phone" },
                { title: t("dashboard.nextActions.testCall.title"), body: t("dashboard.nextActions.testCall.body"), href: "/app/onboarding" },
                { title: t("dashboard.nextActions.shareTeam.title"), body: t("dashboard.nextActions.shareTeam.body"), href: "/app/team" },
              ].map((item, index) => (
                <div key={item.href} className="flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] p-3">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-card)] text-[var(--text-tertiary)]">
                    {index === 0 ? <Phone className="h-3.5 w-3.5" /> : index === 1 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{item.body}</p>
                    <Link href={item.href} className="mt-2 inline-block text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2">
                      {t("dashboard.nextActions.open")}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-[var(--text-tertiary)]" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">{t("dashboard.seeLive.title")}</p>
            </div>
            <div className="mt-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] p-4">
              <p className="text-[13px] text-[var(--text-secondary)]">
                {t("dashboard.seeLive.description")}
              </p>
              <Link
                href="/"
                className="mt-3 inline-flex items-center justify-center rounded-lg border border-[var(--border-medium)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
              >
                {t("dashboard.seeLive.cta")}
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("dashboard.roi.title")}</p>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              {t("dashboard.roi.body")}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("dashboard.systemEvents.title")}</p>
            {systemEvents.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)] mt-2">{t("dashboard.systemEvents.empty")}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {systemEvents.map((event) => (
                  <li key={event.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] p-3">
                    <p className="text-xs font-medium text-[var(--text-primary)]">{event.title}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">{event.body}</p>
                    <Link href={event.href} className="inline-block mt-2 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2">
                      {t("dashboard.systemEvents.view")}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{t("dashboard.testCallCta")}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{t("dashboard.testCallDesc")}</p>
            </div>
            <Link
              href="/app/agents?tab=test"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-white text-gray-900 text-xs font-semibold hover:bg-gray-100 transition-colors"
            >
              {t("dashboard.tryTestCall")} →
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)]">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {t("dashboard.activityTimeline")}
                </p>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[#00D4AA] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00D4AA]" />
                </span>
                <span className="text-xs text-[#5A5A5C]">{t("dashboard.live")}</span>
              </div>
            </div>
            <Timeline
              items={recentActivity.map((card) => ({
                id: card.id,
                title: card.name,
                description: card.summary,
                timestamp:
                  card.duration !== "—"
                    ? `${card.time} · ${card.duration}`
                    : card.time,
                iconColor: TYPE_COLORS[card.type],
                badge: (
                  <span className="inline-flex items-center rounded-full border border-[var(--border-medium)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                    {t(`dashboard.activityType.${card.type}`)}
                  </span>
                ),
              }))}
              className="mt-1"
            />
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {t("dashboard.needsAttention")}
                </p>
              </div>
              {needsAttention.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t("dashboard.allCaughtUp")}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                  {needsAttention.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2"
                    >
                      <span className="truncate">{item.label}</span>
                      <span
                        className={
                          item.tone === "red"
                            ? "h-2.5 w-2.5 rounded-full bg-red-500/80"
                            : item.tone === "amber"
                              ? "h-2.5 w-2.5 rounded-full bg-amber-400/80"
                              : "h-2.5 w-2.5 rounded-full bg-emerald-400/80"
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {t("dashboard.recentSystemEvents")}
              </p>
              {systemEvents.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] mt-2">
                  {t("dashboard.setupEventsPlaceholder")}
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {systemEvents.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] p-3"
                    >
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        {event.title}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">
                        {event.body}
                      </p>
                      <Link
                        href={event.href}
                        className="inline-block mt-2 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
                      >
                        {t("dashboard.viewLink")}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts section */}
      {hasAnyCalls && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
          <div className="bg-[#111113] border border-white/10 rounded-2xl p-6 relative">
            <h3 className="text-sm font-medium text-[#EDEDEF] mb-4">
              {t("dashboard.callVolume7d")}
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={callVolumeData.length > 0 ? callVolumeData : placeholderArea}>
              <defs>
                <linearGradient id="dashboardCallGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F8CFF" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#4F8CFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#5A5A5C" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "#1A1A1D",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  fontSize: 13,
                }}
              />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="#4F8CFF"
                  fill="url(#dashboardCallGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#111113] border border-white/10 rounded-2xl p-6 relative">
            <h3 className="text-sm font-medium text-[#EDEDEF] mb-4">
              {t("dashboard.callOutcomes")}
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={outcomeData.length > 0 ? outcomeData : placeholderPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {(outcomeData.length > 0 ? outcomeData : placeholderPie).map(
                    (_slice, i) => (
                      <Cell
                        key={i}
                        fill={
                          outcomeData.length > 0
                            ? REAL_PIE_COLORS[i % REAL_PIE_COLORS.length]
                            : PIE_COLORS[0]
                        }
                      />
                    ),
                  )}
                </Pie>
                {outcomeData.length > 0 && <Tooltip />}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selectedCard && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            onClick={() => setSelectedCard(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label={t("common.closeDetails")}
          />
          <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:w-[360px] bg-[var(--bg-card-elevated)] border-t md:border-t-0 md:border-l border-[var(--border-default)] rounded-t-2xl md:rounded-none shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">{t("dashboard.detail.callLabel")}</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {selectedCard.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-2 text-sm text-[var(--text-secondary)]">
              <p className="text-xs text-[var(--text-tertiary)]">
                {selectedCard.time} · {selectedCard.duration}
              </p>
              <p>{selectedCard.summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

