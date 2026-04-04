"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

const getCampaignTypeLabel = (type?: string): string => {
  const typeMap: Record<string, string> = {
    cold_outreach: "Cold Outreach",
    follow_up: "Follow-Up",
    appointment_setting: "Appointment Setting",
    no_show_recovery: "No-Show Recovery",
    reactivation: "Reactivation",
    quote_chase: "Quote Chase",
    lead_qualification: "Lead Qualification",
  };
  return typeMap[type?.toLowerCase() || ""] || "Campaign";
};

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<
    string,
    { color: string; bg: string; label: string }
  > = {
    active: {
      color: "#10b981",
      bg: "#10b98115",
      label: "Active",
    },
    paused: {
      color: "#f59e0b",
      bg: "#f59e0b15",
      label: "Paused",
    },
    draft: {
      color: "#6366f1",
      bg: "#6366f115",
      label: "Draft",
    },
    completed: {
      color: "#8b5cf6",
      bg: "#8b5cf615",
      label: "Completed",
    },
    launching: {
      color: "#3b82f6",
      bg: "#3b82f615",
      label: "Launching",
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
  const isActive = campaign.status === "active";
  const answerRate =
    campaign.leads_called > 0
      ? Math.round((campaign.connects / campaign.leads_called) * 100)
      : 0;
  const pendingLeads = campaign.total_leads - campaign.leads_called;
  const typeLabel = getCampaignTypeLabel(campaign.type);

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
        <Circle size={12} className="mt-1.5" style={{ color: "var(--accent-primary)" }} />
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
            c.id === campaignId ? { ...c, status: newStatus as any } : c
          ),
        });
      }

      toast.success(
        `Campaign ${newStatus === "active" ? "started" : "paused"}`
      );
    } catch (err) {
      toast.error("Failed to update campaign");
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
          { label: "Dashboard", href: "/app/dashboard" },
          { label: "Operations", href: "/app/operations" },
        ]}
      />

      <div>
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Mission Control
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Monitor and control all your AI operations in one place
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          icon={Upload}
          title="Import Leads"
          description="Upload a CSV of leads to start calling"
          href="/app/leads?import=1"
        />
        <QuickActionCard
          icon={Phone}
          title="Start Calling"
          description="AI adapts to each lead automatically"
          href="/app/campaigns/create?template=outbound_call"
          color="#3b82f6"
        />
        <QuickActionCard
          icon={Zap}
          title="Create Campaign"
          description="Choose from cold outreach, follow-ups, and more"
          href="/app/campaigns/create"
          color="#8b5cf6"
        />
      </div>

      {/* AI Intelligence Indicator */}
      <div className="dash-section p-4 border border-blue-200 bg-blue-50/30">
        <div className="flex items-start gap-3">
          <Sparkles size={18} color="#3b82f6" className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>AI Intelligence: Active</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              AI adapts its approach for each lead based on profile, score, and history. The system learns from every call to improve results.
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
              Active Campaigns
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
              Total Calls
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
              Appointments Booked
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
              Pending Follow-Ups
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
              Outbound Campaigns
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
              />
              <p
                className="font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Ready to start calling?
              </p>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                Create your first campaign to launch AI calling. Choose from cold outreach, follow-ups, and more.
              </p>
              <Link href="/app/campaigns/create">
                <Button variant="primary">Create Campaign</Button>
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
              Follow-Ups
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
                    pending actions
                  </p>
                </div>
                <AlertCircle size={32} color="#f59e0b" />
              </div>
              <Link href="/app/follow-ups">
                <Button variant="secondary" className="w-full mt-4">
                  View Follow-Ups
                </Button>
              </Link>
            </div>
          ) : (
            <div className="dash-section p-8 text-center">
              <CheckCircle2
                size={32}
                className="mx-auto mb-2 opacity-30"
                style={{ color: "var(--accent-primary)" }}
              />
              <p style={{ color: "var(--text-secondary)" }}>
                All caught up!
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
              Recent Call Activity
            </h2>
          </div>
          <Link href="/app/calls">
            <Button variant="ghost" size="sm">
              View All
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
            <Phone size={32} className="mx-auto mb-3 opacity-30" />
            <p
              className="font-medium mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              No calls yet
            </p>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              Create a campaign to start calling. The AI will handle outreach automatically.
            </p>
            <Link href="/app/campaigns/create">
              <Button variant="secondary">Create Your First Campaign</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
