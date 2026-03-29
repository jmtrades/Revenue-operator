"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  PhoneOutgoing,
  Play,
  Pause,
  Users,
  Target,
  Calendar,
  Plus,
  Loader2,
} from "lucide-react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";

interface Campaign {
  id: string;
  name: string;
  mode: "power" | "preview" | "progressive";
  status: "draft" | "active" | "paused" | "completed";
  total_leads: number;
  leads_called: number;
  leads_remaining: number;
  connects: number;
  appointments_booked: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

function getStatusColor(
  status: Campaign["status"]
): {
  bg: string;
  text: string;
  icon?: string;
} {
  switch (status) {
    case "draft":
      return { bg: "bg-gray-500/10", text: "text-gray-400" };
    case "active":
      return { bg: "bg-emerald-500/10", text: "text-emerald-400", icon: "pulse" };
    case "paused":
      return { bg: "bg-amber-500/10", text: "text-amber-400" };
    case "completed":
      return { bg: "bg-blue-500/10", text: "text-blue-400" };
    default:
      return { bg: "bg-gray-500/10", text: "text-gray-400" };
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CampaignRow({
  campaign,
  onActionClick,
  isUpdating,
}: {
  campaign: Campaign;
  onActionClick: (campaignId: string, action: "start" | "pause") => void;
  isUpdating: string | null;
}) {
  const statusColor = getStatusColor(campaign.status);
  const progress =
    campaign.total_leads > 0
      ? (campaign.leads_called / campaign.total_leads) * 100
      : 0;
  const connectRate =
    campaign.leads_called > 0
      ? ((campaign.connects / campaign.leads_called) * 100).toFixed(0)
      : "0";

  const isLoading = isUpdating === campaign.id;

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {campaign.name}
            </p>
            <span
              className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor.bg} ${statusColor.text} ${
                statusColor.icon === "pulse" ? "animate-pulse" : ""
              }`}
            >
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            {campaign.mode.charAt(0).toUpperCase() + campaign.mode.slice(1)} dialing
          </p>
        </div>

        {/* Action buttons */}
        {campaign.status !== "completed" && campaign.status !== "draft" && (
          <button
            onClick={() => {
              const action = campaign.status === "active" ? "pause" : "start";
              onActionClick(campaign.id, action);
            }}
            disabled={isLoading}
            className="ml-3 p-2 rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={campaign.status === "active" ? "Pause campaign" : "Resume campaign"}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
            ) : campaign.status === "active" ? (
              <Pause className="w-4 h-4 text-[var(--text-secondary)]" />
            ) : (
              <Play className="w-4 h-4 text-[var(--text-secondary)]" />
            )}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-[var(--text-secondary)]">Progress</span>
          <span className="font-medium tabular-nums text-[var(--text-primary)]">
            {campaign.leads_called.toLocaleString()} / {campaign.total_leads.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--bg-hover)]">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width]"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <div>
            <p className="text-[var(--text-tertiary)]">Remaining</p>
            <p className="font-medium text-[var(--text-primary)]">
              {campaign.leads_remaining.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <div>
            <p className="text-[var(--text-tertiary)]">Connect Rate</p>
            <p className="font-medium text-[var(--text-primary)]">{connectRate}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PhoneOutgoing className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <div>
            <p className="text-[var(--text-tertiary)]">Connects</p>
            <p className="font-medium text-[var(--text-primary)]">
              {campaign.connects.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <div>
            <p className="text-[var(--text-tertiary)]">Booked</p>
            <p className="font-medium text-[var(--text-primary)]">
              {campaign.appointments_booked.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Created/Started dates */}
      <div className="flex gap-4 mt-3 pt-3 border-t border-[var(--border-default)] text-xs text-[var(--text-tertiary)]">
        <span>Created: {formatDate(campaign.created_at)}</span>
        {campaign.started_at && (
          <span>Started: {formatDate(campaign.started_at)}</span>
        )}
      </div>
    </div>
  );
}

export function OutboundCampaignCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    fetch(
      `/api/campaigns?workspace_id=${encodeURIComponent(workspaceId)}`,
      {
        credentials: "include",
      }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { campaigns?: Campaign[] } | null) => {
        setCampaigns(data?.campaigns ?? []);
      })
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCampaignAction = useCallback(
    async (campaignId: string, action: "start" | "pause") => {
      setUpdating(campaignId);
      try {
        const newStatus = action === "start" ? "active" : "paused";
        const response = await fetch(`/api/campaigns/${campaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            workspace_id: workspaceId,
            status: newStatus,
          }),
        });

        if (response.ok) {
          setCampaigns((prev) =>
            prev.map((c) =>
              c.id === campaignId ? { ...c, status: newStatus } : c
            )
          );
        }
      } catch (error) {
        console.error(`Failed to ${action} campaign:`, error);
      } finally {
        setUpdating(null);
      }
    },
    [workspaceId]
  );

  if (loading) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="h-5 w-36 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
        <div className="space-y-3">
          <div className="h-24 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
          <div className="h-24 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
        </div>
      </div>
    );
  }

  const activeCampaigns = campaigns.filter(
    (c) => c.status === "active" || c.status === "paused"
  );

  if (activeCampaigns.length === 0) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PhoneOutgoing className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Outbound Campaigns
            </h2>
          </div>
          <Link
            href="/app/campaigns/new"
            className="text-xs text-[var(--accent-primary)] font-medium hover:underline inline-flex items-center gap-1"
          >
            Create campaign <Plus className="w-3 h-3" />
          </Link>
        </div>
        <div className="py-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No active campaigns. Create a campaign to start dialing outbound leads.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-section p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PhoneOutgoing className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Outbound Campaigns
          </h2>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
            {activeCampaigns.length} active
          </span>
        </div>
        <Link
          href="/app/campaigns/new"
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1"
        >
          Create <Plus className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-3">
        {activeCampaigns.slice(0, 3).map((campaign) => (
          <CampaignRow
            key={campaign.id}
            campaign={campaign}
            onActionClick={handleCampaignAction}
            isUpdating={updating}
          />
        ))}
      </div>
    </div>
  );
}
