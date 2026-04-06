"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Target,
  Users,
  Phone,
  Calendar,
  Trophy,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface Campaign {
  id: string;
  name: string;
  status: "active" | "paused" | "completed" | "draft";
  total_contacts: number;
  called_count: number;
  enrolled_count: number;
  booked_count: number;
}

interface CampaignPerformanceCardProps {
  workspaceId: string;
}

function getStatusColor(
  status: Campaign["status"]
): {
  bg: string;
  text: string;
} {
  switch (status) {
    case "active":
      return { bg: "bg-emerald-500/10", text: "text-emerald-400" };
    case "paused":
      return { bg: "bg-amber-500/10", text: "text-amber-400" };
    case "completed":
      return { bg: "bg-blue-500/10", text: "text-blue-400" };
    default:
      return { bg: "bg-gray-500/10", text: "text-gray-400" };
  }
}

function CampaignRow({
  campaign,
  isTopPerformer,
}: {
  campaign: Campaign;
  isTopPerformer: boolean;
}) {
  const statusColor = getStatusColor(campaign.status);
  const progressPercent =
    campaign.total_contacts > 0
      ? (campaign.called_count / campaign.total_contacts) * 100
      : 0;

  const conversionRate =
    campaign.called_count > 0
      ? ((campaign.booked_count / campaign.called_count) * 100).toFixed(1)
      : "0";

  // Calculate funnel: enrolled → called → booked
  const enrolledPct =
    campaign.total_contacts > 0
      ? (campaign.enrolled_count / campaign.total_contacts) * 100
      : 0;
  const calledPct =
    campaign.total_contacts > 0
      ? (campaign.called_count / campaign.total_contacts) * 100
      : 0;
  const bookedPct =
    campaign.total_contacts > 0
      ? (campaign.booked_count / campaign.total_contacts) * 100
      : 0;

  return (
    <motion.div
      variants={staggerItem}
      className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 hover:bg-[var(--bg-hover)] transition-colors"
    >
      {/* Header with name and status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {campaign.name}
            </p>
            <span
              className={`inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-md ${statusColor.bg} ${statusColor.text}`}
            >
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </span>
            {isTopPerformer && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-400">
                <Trophy className="w-3 h-3" />
                Top Performer
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar: contacted / total_contacts */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[var(--text-secondary)]">Contact Progress</span>
          <span className="font-medium tabular-nums text-[var(--text-primary)]">
            {campaign.called_count} / {campaign.total_contacts}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Conversion funnel: 3-step horizontal bar */}
      <div className="mb-3">
        <p className="text-xs text-[var(--text-secondary)] mb-1.5">
          Conversion Funnel
        </p>
        <div className="flex items-center gap-1.5 h-6">
          {/* Enrolled */}
          <div className="flex-1 flex flex-col items-center justify-center relative group">
            <div className="w-full h-1.5 rounded-sm bg-blue-500/20 relative overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-[width] duration-300"
                style={{ width: `${enrolledPct}%` }}
              />
            </div>
            <span className="text-[9px] text-[var(--text-tertiary)] mt-0.5">
              Enrolled
            </span>
          </div>

          {/* Arrow */}
          <div className="text-[var(--text-tertiary)] text-xs">→</div>

          {/* Called */}
          <div className="flex-1 flex flex-col items-center justify-center relative group">
            <div className="w-full h-1.5 rounded-sm bg-purple-500/20 relative overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-[width] duration-300"
                style={{ width: `${calledPct}%` }}
              />
            </div>
            <span className="text-[9px] text-[var(--text-tertiary)] mt-0.5">
              Called
            </span>
          </div>

          {/* Arrow */}
          <div className="text-[var(--text-tertiary)] text-xs">→</div>

          {/* Booked */}
          <div className="flex-1 flex flex-col items-center justify-center relative group">
            <div className="w-full h-1.5 rounded-sm bg-emerald-500/20 relative overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-[width] duration-300"
                style={{ width: `${bookedPct}%` }}
              />
            </div>
            <span className="text-[9px] text-[var(--text-tertiary)] mt-0.5">
              Booked
            </span>
          </div>
        </div>
      </div>

      {/* Key metrics inline grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <div>
            <p className="text-[var(--text-tertiary)]">Total Contacts</p>
            <p className="font-medium text-[var(--text-primary)]">
              {campaign.total_contacts.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <div>
            <p className="text-[var(--text-tertiary)]">Called</p>
            <p className="font-medium text-[var(--text-primary)]">
              {campaign.called_count.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <div>
            <p className="text-[var(--text-tertiary)]">Booked</p>
            <p className="font-medium text-[var(--text-primary)]">
              {campaign.booked_count.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          <div>
            <p className="text-[var(--text-tertiary)]">Conversion</p>
            <p className="font-medium text-[var(--text-primary)]">
              {conversionRate}%
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CampaignSkeletons() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-3"
    >
      {[...Array(2)].map((_, i) => (
        <motion.div
          key={i}
          variants={staggerItem}
          className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4"
        >
          <div className="h-4 w-40 rounded bg-[var(--bg-hover)] mb-3 skeleton-shimmer" />
          <div className="h-1.5 w-full rounded-full bg-[var(--bg-hover)] mb-3 skeleton-shimmer" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-8 rounded bg-[var(--bg-hover)] skeleton-shimmer" />
            <div className="h-8 rounded bg-[var(--bg-hover)] skeleton-shimmer" />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export function CampaignPerformanceCard({
  workspaceId,
}: CampaignPerformanceCardProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch<{ campaigns?: Campaign[] }>(
        `/api/campaigns?workspace_id=${encodeURIComponent(workspaceId)}`,
        { credentials: "include" }
      );
      setCampaigns(data?.campaigns ?? []);
    } catch {
      // Silent fail — error state returns null
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Campaign Performance
          </h2>
        </div>
        <CampaignSkeletons />
      </div>
    );
  }

  const activeCampaigns = campaigns.filter(
    (c) => c.status === "active" || c.status === "paused" || c.status === "completed"
  );

  if (activeCampaigns.length === 0) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Campaign Performance
          </h2>
        </div>
        <div className="py-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No active campaigns
          </p>
        </div>
      </div>
    );
  }

  // Calculate top performer based on conversion rate
  let topPerformerId: string | null = null;
  let maxConversion = -1;
  activeCampaigns.forEach((c) => {
    const conversion =
      c.called_count > 0 ? c.booked_count / c.called_count : 0;
    if (conversion > maxConversion) {
      maxConversion = conversion;
      topPerformerId = c.id;
    }
  });

  return (
    <div className="dash-section p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Campaign Performance
        </h2>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
          {activeCampaigns.length} active
        </span>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-3"
      >
        {activeCampaigns.map((campaign) => (
          <CampaignRow
            key={campaign.id}
            campaign={campaign}
            isTopPerformer={campaign.id === topPerformerId}
          />
        ))}
      </motion.div>
    </div>
  );
}
