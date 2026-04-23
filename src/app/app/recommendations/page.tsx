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
  TrendingUp,
  PhoneOff,
  Zap,
  ArrowUpRight,
  Target,
} from "lucide-react";

interface Recommendation {
  id: string;
  category: "revenue_recovery" | "performance_optimization" | "growth_opportunity";
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  priority: "high" | "medium" | "low";
}

type CallRow = { outcome?: string | null; call_started_at?: string | null };
type LeadRow = { last_contacted_at?: string | null; status?: string | null };
type CampaignRow = { status?: string | null; completed_at?: string | null };

interface RecommendationsData {
  calls: CallRow[];
  leads: LeadRow[];
  campaigns: CampaignRow[];
  workspace_id: string;
}

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  high: { color: "#ef4444", bg: "#ef444415", label: "High" },
  medium: { color: "#f59e0b", bg: "#f59e0b15", label: "Medium" },
  low: { color: "#6366f1", bg: "#6366f115", label: "Low" },
};

const categoryIcons: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  revenue_recovery: PhoneOff,
  performance_optimization: Zap,
  growth_opportunity: TrendingUp,
};

const RecommendationCard = ({ rec }: { rec: Recommendation }) => {
  const Icon = categoryIcons[rec.category] || Target;
  const cfg = priorityConfig[rec.priority];
  return (
    <Link href={rec.actionHref}>
      <div className="kpi-card group cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 rounded-lg transition-transform group-hover:scale-110" style={{ backgroundColor: `var(--accent-primary)15` }}>
              <Icon size={24} color="var(--accent-primary)" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{rec.title}</h3>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{rec.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <Button variant="secondary" size="sm" className="flex items-center gap-1">
                  {rec.actionLabel}
                  <ArrowUpRight size={14} />
                </Button>
              </div>
            </div>
          </div>
          <Badge variant="neutral" className="px-2 py-1 flex-shrink-0" style={{ borderColor: cfg.color, backgroundColor: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </Badge>
        </div>
      </div>
    </Link>
  );
};

export default function RecommendationsPage() {
  const t = useTranslations("recommendations");
  const tBreadcrumbs = useTranslations("breadcrumbs");
  const { workspaceId } = useWorkspace();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = t("pageTitle", { defaultValue: "Recommendations — Revenue Operator" });
  }, [t]);

  useEffect(() => {
    if (!workspaceId) return void setLoading(false);

    const fetchData = async () => {
      try {
        const [callsRes, leadsRes, campaignsRes] = await Promise.all([
          fetch(`/api/calls?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }).then((r) => r.ok ? r.json() : { calls: [] }),
          fetch(`/api/leads?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }).then((r) => r.ok ? r.json() : { leads: [] }),
          fetch(`/api/campaigns?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }).then((r) => r.ok ? r.json() : { campaigns: [] }),
        ]);
        const data: RecommendationsData = { calls: callsRes.calls ?? [], leads: leadsRes.leads ?? [], campaigns: campaignsRes.campaigns ?? [], workspace_id: workspaceId };
        const recs = generateRecommendations(data, t);
        setRecommendations(recs.sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a.priority] - ({ high: 0, medium: 1, low: 2 })[b.priority]));
      } catch (err) {
        console.error("Failed to load recommendations data:", err);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [workspaceId, t]);

  return (
    <div className="space-y-8 p-6">
      <Breadcrumbs items={[{ label: tBreadcrumbs("dashboard"), href: "/app/dashboard" }, { label: tBreadcrumbs("recommendations") }]} />
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Recommendations</h1>
        <p style={{ color: "var(--text-secondary)" }}>Actionable insights to improve call performance and recover revenue.</p>
      </div>
      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => (<Skeleton key={i} className="h-24 w-full" />))}</div>
      ) : recommendations.length > 0 ? (
        <div className="space-y-4">{recommendations.map((rec) => (<RecommendationCard key={rec.id} rec={rec} />))}</div>
      ) : (
        <div className="rounded-xl border p-12 text-center" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
          <div className="mx-auto max-w-md space-y-3">
            <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>No recommendations yet</p>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>As your AI operator handles more calls, the system will surface actionable insights on missed revenue, follow-up opportunities, and process improvements.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function generateRecommendations(data: RecommendationsData, _t: (key: string, opts?: Record<string, string | number | Date>) => string): Recommendation[] {
  const recs: Recommendation[] = [];
  const missedCalls = data.calls.filter((c) => (c.outcome === "missed" || c.outcome === "voicemail") && c.call_started_at);
  if (missedCalls.length > 0) {
    recs.push({ id: "missed-calls", category: "revenue_recovery", title: `Follow up on ${missedCalls.length} missed calls`, description: `Estimated recovery value: $${missedCalls.length * 150}`, actionLabel: "Follow up", actionHref: "/app/follow-ups", priority: "high" });
  }
  const staleLead = data.leads.filter((l) => {
    if (!l.last_contacted_at) return true;
    const daysAgo = Math.floor((Date.now() - new Date(l.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo >= 7 && l.status !== "converted";
  });
  if (staleLead.length > 0) {
    recs.push({ id: "stale-leads", category: "revenue_recovery", title: `Re-engage ${staleLead.length} inactive leads`, description: "Contacted 7+ days ago with no appointment", actionLabel: "Re-engage", actionHref: "/app/leads", priority: "high" });
  }
  const appointmentRate = data.calls.length > 0 ? Math.round((data.calls.filter((c) => c.outcome === "appointment").length / data.calls.length) * 100) : 0;
  if (data.calls.length > 10 && appointmentRate < 15) {
    recs.push({ id: "low-conversion", category: "performance_optimization", title: `Improve booking script — ${appointmentRate}% conversion rate`, description: "Industry avg: 18-25%. Review agent tone and objection handling.", actionLabel: "Review", actionHref: "/app/agents", priority: "medium" });
  }
  const recentCalls = data.calls.filter((c) => c.call_started_at && Date.now() - new Date(c.call_started_at).getTime() < 7 * 24 * 60 * 60 * 1000);
  if (recentCalls.length > 30) {
    recs.push({ id: "volume-growth", category: "growth_opportunity", title: `${recentCalls.length} calls this week — consider upgrading`, description: "Unlock more concurrent minutes and advanced analytics", actionLabel: "Upgrade plan", actionHref: "/app/billing", priority: "low" });
  }
  const idleCampaigns = data.campaigns.filter((c) => c.status === "paused" && !c.completed_at);
  if (idleCampaigns.length > 0) {
    recs.push({ id: "idle-campaigns", category: "growth_opportunity", title: `Reactivate ${idleCampaigns.length} paused campaign${idleCampaigns.length > 1 ? "s" : ""}`, description: "Resume calling to build your pipeline", actionLabel: "Reactivate", actionHref: "/app/operations", priority: "medium" });
  }
  return recs;
}
