"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";
import { Shell } from "@/components/Shell";
import { HandoffList } from "@/components/HandoffList";
import { DashboardExecutionStateBanner } from "@/components/ExecutionStateBanner";
import { TrialGraceEndedBanner } from "@/components/TrialGraceEndedBanner";
import {
  Phone,
  TrendingUp,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Clock,
  AlertCircle,
  Zap,
} from "lucide-react";

interface Capsule {
  today: string[];
  proof: string[];
  reversion: string[];
  position: Record<string, unknown>;
}
interface RetentionPayload {
  recent_operation: string[];
  current_dependency: string[];
  if_disabled: string[];
}
interface Handoff {
  id: string;
  lead_id: string;
  who: string;
  when: string;
  decision_needed: string;
}
interface QuickStats {
  active_leads: number;
  recent_calls: number;
  pending_followups: number;
}
interface RevenueAtRisk {
  total_at_risk: number;
  avg_deal_value: number;
  categories: Array<{
    key: string;
    label: string;
    count: number;
    estimatedRevenue: number;
    action: string;
    actionLabel: string;
  }>;
}
interface KnowledgeGap {
  id: string;
  question: string;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
}

export default function SituationPage() {
  const searchParams = useSearchParams();
  const t = useTranslations("dashboard");
  const { workspaceId, workspaces } = useWorkspace();
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [retention, setRetention] = useState<RetentionPayload | null>(null);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [beyondScope, setBeyondScope] = useState(false);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [revenueRisk, setRevenueRisk] = useState<RevenueAtRisk | null>(null);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setCapsule(null);
      setRetention(null);
      setHandoffs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchWithFallback<Capsule>(`/api/operational/operator-capsule?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
      fetchWithFallback<RetentionPayload>(`/api/operational/retention-intercept?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
      fetchWithFallback<{ handoffs: Handoff[]; beyond_scope?: boolean }>(`/api/handoffs?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
      fetchWithFallback<QuickStats>(`/api/dashboard/quick-stats?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
      fetchWithFallback<RevenueAtRisk>(`/api/dashboard/revenue-at-risk?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
      fetchWithFallback<{ gaps: KnowledgeGap[]; total: number }>(`/api/dashboard/knowledge-gaps?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
    ]).then(([capRes, retRes, handRes, statsRes, riskRes, gapsRes]) => {
      if (capRes.data) setCapsule(capRes.data);
      if (retRes.data) setRetention(retRes.data);
      if (handRes.data?.handoffs) {
        setHandoffs(handRes.data.handoffs);
        setBeyondScope(handRes.data.beyond_scope === true);
      }
      if (statsRes.data) setStats(statsRes.data);
      if (riskRes.data) setRevenueRisk(riskRes.data);
      if (gapsRes.data?.gaps) setGaps(gapsRes.data.gaps);
    }).finally(() => setLoading(false));
  }, [workspaceId]);

  if (workspaces.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8" style={{ background: "var(--background)" }}>
        <div className="max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--accent-primary-subtle)" }}>
              <Phone size={32} style={{ color: "var(--accent-primary)" }} />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            {t("onboarding.readyTitle")}
          </h1>
          <p className="text-base mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {t("onboarding.readyDescription")}
          </p>
          <Link
            href="/activate"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-colors hover:opacity-90"
            style={{ background: "var(--accent-primary)", color: "white" }}
          >
            {t("onboarding.startTrial")}
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-lg" style={{ color: "var(--text-muted)" }}>{t("loading")}</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (handoffs.length > 0) {
    return (
      <Shell>
        <HandoffList handoffs={handoffs} beyondScope={beyondScope} />
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("loading")}</p>
      </Shell>
    );
  }

  const CAP = 6;
  const currentStateFull = [...(capsule?.today ?? []), ...(capsule?.proof ?? [])].filter(Boolean);
  const recentChangeFull = retention?.recent_operation ?? [];
  const ifRemovedFull = [...(capsule?.reversion ?? []), ...(retention?.if_disabled ?? [])].filter(Boolean);
  const currentState = currentStateFull.slice(0, CAP);
  const recentChange = recentChangeFull.slice(0, CAP);
  const ifRemoved = ifRemovedFull.slice(0, CAP);
  const hasMoreCurrent = currentStateFull.length > CAP;
  const hasMoreRecent = recentChangeFull.length > CAP;
  const hasMoreRemoved = ifRemovedFull.length > CAP;
  const recordHref = `/dashboard/record${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const callsHref = `/dashboard/calls${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  // Get workspace name
  const currentWorkspace = workspaces.find(w => w.id === workspaceId);
  const businessName = currentWorkspace?.name || "Your Business";

  return (
    <Shell>
      <TrialGraceEndedBanner />
      <DashboardExecutionStateBanner />

      {/* Welcome Section */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          {t("welcomeBack")}
        </h1>
        <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
          {businessName}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <Link href={callsHref} className="rounded-lg border p-6 transition-[box-shadow,border-opacity] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:shadow-md hover:border-opacity-50 active:scale-[0.97]" style={{ borderColor: "var(--border-default)", background: "var(--card)", borderWidth: "1px" }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-primary-subtle)" }}>
              <Phone size={20} style={{ color: "var(--accent-primary)" }} />
            </div>
          </div>
          {(stats?.recent_calls ?? 0) > 0 ? (
            <p className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
              {stats?.recent_calls}
            </p>
          ) : (
            <p className="text-xl font-semibold mb-1" style={{ color: "var(--text-tertiary)" }}>
              {t("stats.startsAfterFirstCall")}
            </p>
          )}
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("stats.activeCalls")}</p>
        </Link>

        <div className="rounded-lg border p-6" style={{ borderColor: "var(--border-default)", background: "var(--card)", borderWidth: "1px" }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--meaning-green)" }}>
              <TrendingUp size={20} color="white" />
            </div>
          </div>
          {(stats?.active_leads ?? 0) > 0 ? (
            <p className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
              {stats?.active_leads ?? 0}
            </p>
          ) : (
            <p className="text-xl font-semibold mb-1" style={{ color: "var(--text-tertiary)" }}>
              {t("stats.startsAfterFirstCall")}
            </p>
          )}
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("stats.activeLeads")}</p>
        </div>

        <Link href={`/dashboard/follow-ups${searchParams.get("workspace_id") ? `?workspace_id=${searchParams.get("workspace_id")}` : ""}`} className="rounded-lg border p-6 transition-[box-shadow,border-opacity] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:shadow-md hover:border-opacity-50 active:scale-[0.97]" style={{ borderColor: "var(--border-default)", background: "var(--card)", borderWidth: "1px" }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--meaning-blue)" }}>
              <CheckCircle2 size={20} color="white" />
            </div>
          </div>
          {(stats?.pending_followups ?? 0) > 0 ? (
            <p className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
              {stats?.pending_followups}
            </p>
          ) : (
            <p className="text-xl font-semibold mb-1" style={{ color: "var(--text-tertiary)" }}>
              {t("stats.startsAfterFirstCall")}
            </p>
          )}
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("kpis.pendingFollowups")}</p>
        </Link>

        <Link href={`/dashboard/leads?filter=followup${searchParams.get("workspace_id") ? `&workspace_id=${searchParams.get("workspace_id")}` : ""}`} className="rounded-lg border p-6 transition-[box-shadow,border-opacity] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:shadow-md hover:border-opacity-50 active:scale-[0.97]" style={{ borderColor: "var(--border-default)", background: "var(--card)", borderWidth: "1px" }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--meaning-purple)" }}>
              <Calendar size={20} color="white" />
            </div>
          </div>
          {(stats?.pending_followups ?? 0) > 0 ? (
            <p className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
              {stats?.pending_followups}
            </p>
          ) : (
            <p className="text-xl font-semibold mb-1" style={{ color: "var(--text-tertiary)" }}>
              {t("stats.startsAfterFirstCall")}
            </p>
          )}
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("kpis.appointmentsBooked")}</p>
        </Link>
      </div>
      {/* Getting Started Section */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Zap size={24} style={{ color: "var(--accent-primary)" }} />
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{t("gettingStarted.title")}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/settings/business"
            className="rounded-lg border p-6 transition-[border-color,box-shadow,transform] hover:shadow-md hover:border-opacity-50 group"
            style={{ borderColor: "var(--border-default)", background: "var(--card)" }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-primary-subtle)" }}>
                <CheckCircle2 size={20} style={{ color: "var(--accent-primary)" }} />
              </div>
              <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} className="group-hover:translate-x-1 transition-[transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]" />
            </div>
            <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{t("gettingStarted.completeProfile")}</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("gettingStarted.completeProfileDesc")}</p>
          </Link>

          <Link
            href="/dashboard/settings/phone"
            className="rounded-lg border p-6 transition-[border-color,box-shadow,transform] hover:shadow-md hover:border-opacity-50 group"
            style={{ borderColor: "var(--border-default)", background: "var(--card)" }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-primary-subtle)" }}>
                <Phone size={20} style={{ color: "var(--accent-primary)" }} />
              </div>
              <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} className="group-hover:translate-x-1 transition-[transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]" />
            </div>
            <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{t("gettingStarted.setupNumber")}</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("gettingStarted.setupNumberDesc")}</p>
          </Link>

          <Link
            href="/dashboard/settings/voices"
            className="rounded-lg border p-6 transition-[border-color,box-shadow,transform] hover:shadow-md hover:border-opacity-50 group"
            style={{ borderColor: "var(--border-default)", background: "var(--card)" }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-primary-subtle)" }}>
                <Clock size={20} style={{ color: "var(--accent-primary)" }} />
              </div>
              <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} className="group-hover:translate-x-1 transition-[transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]" />
            </div>
            <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{t("gettingStarted.chooseVoice")}</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("gettingStarted.chooseVoiceDesc")}</p>
          </Link>

          <Link
            href="/dashboard/calls"
            className="rounded-lg border p-6 transition-[border-color,box-shadow,transform] hover:shadow-md hover:border-opacity-50 group"
            style={{ borderColor: "var(--border-default)", background: "var(--card)" }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-primary-subtle)" }}>
                <AlertCircle size={20} style={{ color: "var(--accent-primary)" }} />
              </div>
              <ChevronRight size={18} style={{ color: "var(--text-tertiary)" }} className="group-hover:translate-x-1 transition-[transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]" />
            </div>
            <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{t("gettingStarted.viewActivity")}</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("gettingStarted.viewActivityDesc")}</p>
          </Link>
        </div>
      </div>

      {/* Revenue At Risk Widget */}
      {revenueRisk && revenueRisk.categories.length > 0 && (
        <div className="mb-10 rounded-lg border p-6" style={{ borderColor: "var(--border-default)", background: "var(--card)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("revenueAtRisk.title")}</h3>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{t("revenueAtRisk.subtitle")}</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--meaning-red)" }}>${revenueRisk.total_at_risk.toLocaleString()}</p>
          </div>
          <div className="space-y-3">
            {revenueRisk.categories.map((cat) => (
              <div key={cat.key} className="flex items-center justify-between gap-4 py-3 border-t" style={{ borderColor: "var(--border-default)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {cat.label}
                    <span className="ml-2 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "var(--meaning-red)" }}>
                      {cat.count}
                    </span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>~${cat.estimatedRevenue.toLocaleString()} at risk</p>
                </div>
                <Link
                  href={cat.action}
                  className="text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                  style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}
                >
                  {cat.actionLabel}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Gaps */}
      {gaps.length > 0 && (
        <div className="mb-10 rounded-lg border p-6" style={{ borderColor: "var(--border-default)", background: "var(--card)" }}>
          <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{t("knowledgeGaps.title")}</h3>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>{t("knowledgeGaps.description")}</p>
          <div className="space-y-3">
            {gaps.slice(0, 5).map((gap) => (
              <div key={gap.id} className="flex items-center justify-between gap-4 py-3 border-t" style={{ borderColor: "var(--border-default)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>&ldquo;{gap.question}&rdquo;</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Asked {gap.occurrences}x</p>
                </div>
                <Link
                  href={`/dashboard/agents?gap=${gap.id}`}
                  className="text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                  style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}
                >
                  {t("knowledgeGaps.addAnswer")}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{t("recentActivity.title")}</h2>
          <Link href={callsHref} className="text-sm font-medium flex items-center gap-1 transition-[color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]" style={{ color: "var(--accent-primary)" }}>
            {t("recentActivity.viewAll")}
            <ChevronRight size={16} />
          </Link>
        </div>

        {currentState.length === 0 && recentChange.length === 0 ? (
          <div className="rounded-lg border p-12 text-center" style={{ borderColor: "var(--border-default)", background: "var(--card)" }}>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--accent-primary-subtle)" }}>
                <Phone size={24} style={{ color: "var(--accent-primary)" }} />
              </div>
            </div>
            <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{t("recentActivity.emptyTitle")}</h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              {t("recentActivity.emptyDescription")}
            </p>
            <Link
              href={`/dashboard/settings/phone${searchParams.get("workspace_id") ? `?workspace_id=${searchParams.get("workspace_id")}` : ""}`}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-[background-color,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:opacity-90 active:scale-[0.97]"
              style={{ background: "var(--accent-primary)", color: "#fff" }}
            >
              {t("gettingStarted.setupNumber")}
              <ChevronRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {currentState.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Current Status</h3>
                <div className="space-y-2">
                  {currentState.map((line, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: "var(--accent-primary)" }} />
                      <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                        {line}
                      </p>
                    </div>
                  ))}
                  {hasMoreCurrent && (
                    <Link href={recordHref} className="text-sm font-medium mt-2 transition-[color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]" style={{ color: "var(--accent-primary)" }}>
                      View more records
                    </Link>
                  )}
                </div>
              </section>
            )}

            {recentChange.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Recent Updates</h3>
                <div className="space-y-2">
                  {recentChange.map((line, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: "var(--accent-primary)" }} />
                      <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                        {line}
                      </p>
                    </div>
                  ))}
                  {hasMoreRecent && (
                    <Link href={recordHref} className="text-sm font-medium mt-2 transition-[color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]" style={{ color: "var(--accent-primary)" }}>
                      View more updates
                    </Link>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
