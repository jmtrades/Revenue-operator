"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Upload,
  Phone,
  Zap,
  Clock,
  AlertCircle,
  Play,
  Pause,
  TrendingUp,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  type?: string;
  status: "draft" | "active" | "paused" | "completed" | "launching";
  total_leads: number;
  leads_called: number;
  connects: number;
  appointments_booked: number;
  created_at: string;
}

interface CallRecord {
  id: string;
  matched_lead?: { name?: string; company?: string } | null;
  outcome?: string | null;
  call_started_at?: string | null;
  summary?: string | null;
  analysis_outcome?: string | null;
}

interface OperationsData {
  campaigns: Campaign[];
  recent_calls: CallRecord[];
  pending_followups: number;
  workspace_id: string;
}

const QuickActionCard = ({
  icon: Icon,
  title,
  description,
  href,
  color = "var(--accent-primary)",
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  description: string;
  href: string;
  color?: string;
}) => (
  <Link href={href}>
    <div className="kpi-card group cursor-pointer">
      <div className="flex items-start gap-4">
        <div
          className="p-3 rounded-lg transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={24} color={color} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {title}
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  </Link>
);

const getCampaignTypeLabel = (type?: string, t?: (key: string) => string): string => {
  const typeMap: Record<string, string> = {
    cold_outreach: t?.("campaignTypes.coldOutreach") ?? "Cold Outreach",
    follow_up: t?.("campaignTypes.followUp") ?? "Follow-Up",
    appointment_setting: t?.("campaignTypes.appointmentSetting") ?? "Appointment Setting",
    no_show_recovery: t?.("campaignTypes.noShowRecovery") ?? "No-Show Recovery",
    reactivation: t?.("campaignTypes.reactivation") ?? "Reactivation",
    quote_chase: t?.("campaignTypes.quoteChase") ?? "Quote Chase",
    lead_qualification: t?.("campaignTypes.leadQualification") ?? "Lead Qualification",
  };
  return typeMap[type?.toLowerCase() || ""] || (t?.("campaignTypes.campaign") ?? "Campaign");
};

const StatusBadge = ({ status }: { status: string }) => {
  const t = useTranslations("operations");

  const statusConfig: Record<
    string,
    { color: string; bg: string; label: string }
  > = {
    active: {
      color: "#10b981",
      bg: "#10b98115",
      label: t("statuses.active"),
    },
    paused: {
      color: "#f59e0b",
      bg: "#f59e0b15",
      label: t("statuses.paused"),
    },
    draft: {
      color: "#6366f1",
      bg: "#6366f115",
      label: t("statuses.draft"),
    },
    completed: {
      color: "#8b5cf6",
      bg: "#8b5cf615",
      label: t("statuses.completed"),
    },
    launching: {
      color: "#3b82f6",
      bg: "#3b82f615",
      label: t("statuses.launching"),
    },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge
      variant="neutral"
      className="px-2 py-1"
      style={{
        borderColor: config.color,
        backgroundColor: config.bg,
        color: config.color,
      }}
    >
      {config.label}
    </Badge>
  );
};

const CampaignRow = ({
  campaign,
  onToggle,
}: {
  campaign: Campaign;
  onToggle: (id: string, status: string) => void;
}) => {
  const t = useTranslations("operations");
  const isActive = campaign.status === "active";
  const answerRate =
    campaign.leads_called > 0
      ? Math.round((campaign.connects / campaign.leads_called) * 100)
      : 0;
  const pendingLeads = campaign.total_leads - campaign.leads_called;
  const typeLabel = getCampaignTypeLabel(campaign.type, t);

  return (
    <div className="dash-section p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4
              className="font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {campaign.name}
            </h4>
            <Badge variant="info" className="px-2 py-0.5 text-xs">
              {typeLabel}
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span style={{ color: "var(--text-tertiary)" }}>
                {campaign.leads_called} of {campaign.total_leads} called
              </span>
            </div>
            <div>
              <span style={{ color: "var(--text-tertiary)" }}>
                {pendingLeads} pending
              </span>
            </div>
            <div>
              <span style={{ color: "var(--text-tertiary)" }}>
                {answerRate}% connect rate
              </span>
            </div>
            <div>
              <span style={{ color: "var(--text-tertiary)" }}>
                {campaign.appointments_booked} appointments
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={campaign.status} />
          {campaign.status !== "completed" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onToggle(campaign.id, isActive ? "paused" : "active")
              }
              aria-label={isActive ? t("messages.campaignPaused") : t("messages.campaignStarted")}
            >
              {isActive ? (
                <Pause size={18} />
              ) : (
                <Play size={18} />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const CallActivityCard = ({ call }: { call: CallRecord }) => {
  const leadName = call.matched_lead?.name || "Unknown";
  const company = call.matched_lead?.company || "";
  const timestamp = call.call_started_at
    ? new Date(call.call_started_at).toLocaleTimeString()
    : "N/A";

  return (
    <div className="dash-section p-4">
      <div className="flex items-start gap-3">
        <Circle size={12} className="mt-1.5" style={{ color: "var(--accent-primary)" }} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h4
            className="font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {leadName}
          </h4>
          <p
            className="text-sm truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {company} • {timestamp}
          </p>
          {call.summary && (
            <p
              className="text-sm mt-2 line-clamp-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              {call.summary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default function OperationsPage() {
  const t = useTranslations("operations");
  const tBreadcrumbs = useTranslations("breadcrumbs");
  const { workspaceId } = useWorkspace();
  const [data, setData] = useState<OperationsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!workspaceId) {
        setLoading(false);
        return;
      }

      try {
        const [campaignsRes, callsRes, summaryRes] = await Promise.all([
          fetch(`/api/campaigns?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }).then(r => r.ok ? r.json() : { campaigns: [] }),
          fetch(`/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }).then(r => r.ok ? r.json() : { calls: [] }),
          fetch(`/api/dashboard/summary?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }).then(r => r.ok ? r.json() : { pending_follow_ups: 0 }),
        ]);

        setData({
          campaigns: campaignsRes.campaigns ?? [],
          recent_calls: (callsRes.calls ?? []).slice(0, 5),
          pending_followups: summaryRes.pending_follow_ups ?? 0,
          workspace_id: workspaceId,
        });
      } catch (err) {
        console.error("Failed to load operations data:", err);
        setData({
          campaigns: [],
          recent_calls: [],
          pending_followups: 0,
          workspace_id: workspaceId,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId]);

  const handleCampaignToggle = async (campaignId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");

      if (data) {
        setData({
          ...data,
          campaigns: data.campaigns.map((c) =>
            c.id === campaignId ? { ...c, status: newStatus as Campaign["status"] } : c
          ),
        });
      }

      toast.success(
        t(newStatus === "active" ? "messages.campaignStarted" : "messages.campaignPaused")
      );
    } catch (err) {
      toast.error(t("messages.failedToUpdateCampaign"));
      console.error(err);
    }
  };

  const activeCampaigns = data?.campaigns.filter(
    (c) => c.status === "active"
  ) || [];
  const outboundCampaigns = data?.campaigns.filter(
    (c) => c.status !== "completed"
  ) || [];

  return (
    <div className="space-y-8 p-6">
      <Breadcrumbs
        items={[
          { label: tBreadcrumbs("dashboard"), href: "/app/dashboard" },
          { label: tBreadcrumbs("operations"), href: "/app/operations" },
        ]}
      />

      <div>
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          {t("title")}
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          {t("subtitle")}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          icon={Upload}
          title={t("quickActions.importLeads")}
          description={t("quickActions.importLeadsDesc")}
          href="/app/leads?import=1"
        />
        <QuickActionCard
          icon={Phone}
          title={t("quickActions.startCalling")}
          description={t("quickActions.startCallingDesc")}
          href="/app/campaigns/create?template=outbound_call"
          color="#3b82f6"
        />
        <QuickActionCard
          icon={Zap}
          title={t("quickActions.createCampaign")}
          description={t("quickActions.createCampaignDesc")}
          href="/app/campaigns/create"
          color="#8b5cf6"
        />
      </div>

      {/* AI Intelligence Indicator */}
      <div className="dash-section p-4 border border-blue-200 bg-blue-50/30">
        <div className="flex items-start gap-3">
          <Sparkles size={18} color="#3b82f6" className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{t("aiIntelligence.title")}</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {t("aiIntelligence.description")}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="kpi-card">
              <Skeleton className="h-12 w-12 mb-2" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="kpi-card">
            <p
              className="text-sm mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("metrics.activeCampaigns")}
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: "var(--accent-primary)" }}
            >
              {activeCampaigns.length}
            </p>
          </div>
          <div className="kpi-card">
            <p
              className="text-sm mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("metrics.totalCalls")}
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: "var(--accent-primary)" }}
            >
              {data?.campaigns.reduce((sum, c) => sum + c.leads_called, 0) || 0}
            </p>
          </div>
          <div className="kpi-card">
            <p
              className="text-sm mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("metrics.appointmentsBooked")}
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: "var(--accent-primary)" }}
            >
              {data?.campaigns.reduce((sum, c) => sum + c.appointments_booked, 0) || 0}
            </p>
          </div>
          <div className="kpi-card">
            <p
              className="text-sm mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("metrics.pendingFollowUps")}
            </p>
            <p
              className="text-3xl font-bold"
              style={{ color: "#f59e0b" }}
            >
              {data?.pending_followups || 0}
            </p>
          </div>
        </div>
      )}

      {/* Operations Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Outbound Campaigns */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Phone size={20} style={{ color: "var(--accent-primary)" }} />
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("sections.outboundCampaigns")}
            </h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : outboundCampaigns.length > 0 ? (
            <div className="space-y-3">
              {outboundCampaigns.map((campaign) => (
                <CampaignRow
                  key={campaign.id}
                  campaign={campaign}
                  onToggle={handleCampaignToggle}
                />
              ))}
            </div>
          ) : (
            <div className="dash-section p-8 text-center">
              <Zap
                size={32}
                className="mx-auto mb-3 opacity-30"
                aria-hidden="true"
              />
              <p
                className="font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                {t("emptyState.campaigns.title")}
              </p>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("emptyState.campaigns.description")}
              </p>
              <Link href="/app/campaigns/create">
                <Button variant="primary">{t("emptyState.campaigns.cta")}</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Follow-Ups */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} style={{ color: "var(--accent-primary)" }} />
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("sections.followUps")}
            </h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : data?.pending_followups ? (
            <div className="dash-section p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {data.pending_followups}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {t("followUps.pendingActions")}
                  </p>
                </div>
                <AlertCircle size={32} color="#f59e0b" />
              </div>
              <Link href="/app/follow-ups">
                <Button variant="secondary" className="w-full mt-4">
                  {t("followUps.viewAll")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="dash-section p-8 text-center">
              <CheckCircle2
                size={32}
                className="mx-auto mb-2 opacity-30"
                style={{ color: "var(--accent-primary)" }}
                aria-hidden="true"
              />
              <p style={{ color: "var(--text-secondary)" }}>
                {t("followUps.allCaughtUp")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Call Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp
              size={20}
              style={{ color: "var(--accent-primary)" }}
            />
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("sections.recentCalls")}
            </h2>
          </div>
          <Link href="/app/calls">
            <Button variant="ghost" size="sm">
              {t("actions.viewAll")}
            </Button>
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : data?.recent_calls.length ? (
          <div className="space-y-3">
            {data.recent_calls.map((call) => (
              <CallActivityCard key={call.id} call={call} />
            ))}
          </div>
        ) : (
          <div className="dash-section p-8 text-center">
            <Phone size={32} className="mx-auto mb-3 opacity-30" aria-hidden="true" />
            <p
              className="font-medium mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {t("emptyState.calls.title")}
            </p>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("emptyState.calls.description")}
            </p>
            <Link href="/app/campaigns/create">
              <Button variant="secondary">{t("emptyState.calls.cta")}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
