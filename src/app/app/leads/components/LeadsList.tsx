"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { LeadScoreBadge } from "@/components/intelligence/LeadScoreBadge";
import type { LeadView } from "../page";
import { getSourceDisplay, getStatusDisplay } from "../helpers";

interface LeadIntelligenceSummary {
  urgency_score: number;
  intent_score: number;
  engagement_score: number;
  next_best_action: string;
  risk_flags: string[];
  conversion_probability: number;
}

function useLeadIntelligenceBatch(leadIds: string[]) {
  const [data, setData] = useState<Record<string, LeadIntelligenceSummary>>({});
  const fetchedRef = useRef<string>("");

  useEffect(() => {
    const key = leadIds.slice().sort().join(",");
    if (!key || key === fetchedRef.current) return;
    fetchedRef.current = key;

    // Batch intelligence requests are limited to 50 leads for performance.
    // Leads beyond 50 will not have intelligence data fetched.
    fetch("/api/leads/intelligence/batch", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_ids: leadIds.slice(0, 50) }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json && typeof json === "object") {
          // Filter out null entries — only keep leads with intelligence data
          const valid: Record<string, LeadIntelligenceSummary> = {};
          for (const [k, v] of Object.entries(json)) {
            if (v && typeof v === "object" && "urgency_score" in (v as Record<string, unknown>)) {
              valid[k] = v as LeadIntelligenceSummary;
            }
          }
          setData(valid);
        }
      })
      .catch((err) => {
        console.error("[leads] intelligence batch failed:", err?.message ?? err);
      });
  }, [leadIds]);

  return data;
}

type ScoreBucket = "all" | "high" | "medium" | "low";

const SCORE_COLORS: Record<ScoreBucket, string> = {
  high: "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/40",
  medium: "bg-[var(--accent-warning,#f59e0b)]/15 text-[var(--accent-warning,#f59e0b)] border-[var(--accent-warning,#f59e0b)]/40",
  low: "bg-[var(--accent-danger,#ef4444)]/15 text-[var(--accent-danger,#ef4444)] border-[var(--accent-danger,#ef4444)]/40",
  all: "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-medium)]",
};

function scoreBucket(score: number | null): ScoreBucket {
  if (score === null) return "low";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function timeSince(iso: string, t: (k: string, p?: { count?: number }) => string): string {
  const d = new Date(iso).getTime();
  const diffMs = Date.now() - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return t("timeToday");
  if (diffDays === 1) return t("timeOneDayAgo");
  if (diffDays < 7) return t("timeDaysAgo", { count: diffDays });
  const weeks = Math.floor(diffDays / 7);
  if (weeks === 1) return t("timeOneWeekAgo");
  return t("timeWeeksAgo", { count: weeks });
}

interface LeadsListProps {
  loading: boolean;
  error: string | null;
  filteredLeads: LeadView[];
  selectedIds: Set<string>;
  toggleAllSelected: (checked: boolean) => void;
  toggleSelected: (id: string) => void;
  openDrawer: (lead: LeadView) => void;
}

export function LeadsList({
  loading,
  error,
  filteredLeads,
  selectedIds,
  toggleAllSelected,
  toggleSelected,
  openDrawer,
}: LeadsListProps) {
  const t = useTranslations();
  const tLeads = useTranslations("leads");
  const leadIds = (!loading && !error && filteredLeads.length > 0) ? filteredLeads.map((l) => l.id) : [];
  const intelligence = useLeadIntelligenceBatch(leadIds);
  if (loading) {
    return (
      <div className="mt-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Skeleton variant="rectangular" className="h-9 w-40 rounded-xl" />
            <Skeleton variant="rectangular" className="h-9 w-32 rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="rectangular" className="h-9 w-24 rounded-xl" />
            <Skeleton variant="rectangular" className="h-9 w-24 rounded-xl" />
          </div>
        </div>
        <div className="mt-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="grid grid-cols-[0.4fr,1.2fr,1.2fr,1fr,1fr,1fr,1fr] gap-2 px-4 py-3 border-b border-[var(--border-default)]">
            <Skeleton variant="text" className="h-4 w-4" />
            <Skeleton variant="text" className="h-4 w-24" />
            <Skeleton variant="text" className="h-4 w-24" />
            <Skeleton variant="text" className="h-4 w-20" />
            <Skeleton variant="text" className="h-4 w-16" />
            <Skeleton variant="text" className="h-4 w-20" />
            <Skeleton variant="text" className="h-4 w-20" />
          </div>
          <div className="divide-y divide-[var(--border-default)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[0.4fr,1.2fr,1.2fr,1fr,1fr,1fr,1fr] gap-2 px-4 py-3"
              >
                <Skeleton variant="text" className="h-4 w-4" />
                <Skeleton variant="text" className="h-4 w-32" />
                <Skeleton variant="text" className="h-4 w-28" />
                <Skeleton variant="text" className="h-4 w-20" />
                <Skeleton variant="text" className="h-4 w-16" />
                <Skeleton variant="text" className="h-4 w-20" />
                <Skeleton variant="text" className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 text-sm text-[var(--accent-red)]" role="alert">
        {error}
      </div>
    );
  }

  if (filteredLeads.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={tLeads("empty.title")}
        description={tLeads("empty.description")}
        primaryAction={{
          label: tLeads("empty.connectCrm") ?? "Connect CRM",
          href: "/app/settings/integrations",
        }}
        secondaryAction={{
          label: tLeads("importCsv"),
          href: "/app/leads?import=1",
        }}
      />
    );
  }

  return (
    <>
      <div className="hidden md:block rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border-default)] bg-[var(--bg-card)]">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-[var(--border-medium)] bg-[var(--bg-input)] text-[var(--text-primary)]"
                  checked={
                    filteredLeads.length > 0 &&
                    selectedIds.size === filteredLeads.length
                  }
                  onChange={(e) => toggleAllSelected(e.target.checked)}
                />
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">
                {tLeads("table.name")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">
                {tLeads("table.phone")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">
                {tLeads("table.source")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">
                {tLeads("table.score")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">
                {tLeads("table.stage")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">
                {tLeads("table.lastContact")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                  AI
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => {
              const checked = selectedIds.has(lead.id);
              const sb = scoreBucket(lead.score);
              const scoreClass = SCORE_COLORS[sb];
              return (
                <tr
                  key={lead.id}
                  className="border-t border-[var(--border-default)]/70 hover:bg-[var(--bg-input)]/60 cursor-pointer"
                  onClick={() => openDrawer(lead)}
                >
                  <td
                    className="py-3 px-4"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-[var(--border-medium)] bg-[var(--bg-input)] text-[var(--text-primary)]"
                      checked={checked}
                      onChange={() => toggleSelected(lead.id)}
                    />
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--text-primary)]">
                    <div className="flex flex-col gap-1">
                      <span>{lead.name && lead.name !== "New Lead" ? lead.name : (lead.phone || lead.email || "Unknown")}</span>
                      {intelligence[lead.id] ? (
                        <LeadScoreBadge
                          urgency={intelligence[lead.id].urgency_score}
                          intent={intelligence[lead.id].intent_score}
                          engagement={intelligence[lead.id].engagement_score}
                          nextAction={intelligence[lead.id].next_best_action}
                          riskFlags={intelligence[lead.id].risk_flags}
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--text-tertiary)]">
                    {lead.phone}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <Badge variant="neutral">{getSourceDisplay(lead.source, t)}</Badge>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-medium ${scoreClass}`}
                      title={`Score: ${lead.score ?? "—"}`}
                    >
                      {lead.score ?? "—"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <Badge
                      variant={
                        lead.status === "Won"
                          ? "success"
                          : lead.status === "Lost"
                            ? "error"
                            : "neutral"
                      }
                    >
                      {getStatusDisplay(lead.status, t)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--text-tertiary)]">
                    {timeSince(lead.lastContactAt, tLeads)}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {intelligence[lead.id] ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        Active
                      </span>
                    ) : leadIds.indexOf(lead.id) < 50 ? (
                      <span className="text-[var(--text-tertiary)]">Pending</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      {filteredLeads.length > 0 && (
        <div className="md:hidden space-y-3 mt-3">
          {filteredLeads.map((lead) => {
            const sb = scoreBucket(lead.score);
            const scoreClass = SCORE_COLORS[sb];
            return (
              <button
                key={lead.id}
                type="button"
                onClick={() => openDrawer(lead)}
                className="w-full text-left rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {lead.name && lead.name !== "New Lead" ? lead.name : (lead.phone || lead.email || "Unknown")}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${scoreClass}`}
                  >
                    <span>{lead.score ?? "—"}</span>
                  </span>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">{lead.phone}</p>
                {intelligence[lead.id] ? (
                  <div className="mt-0.5">
                    <LeadScoreBadge
                      urgency={intelligence[lead.id].urgency_score}
                      intent={intelligence[lead.id].intent_score}
                      engagement={intelligence[lead.id].engagement_score}
                      nextAction={intelligence[lead.id].next_best_action}
                      riskFlags={intelligence[lead.id].risk_flags}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)]">{lead.service}</p>
                )}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-full border border-[var(--border-medium)] px-2 py-0.5 text-[11px] text-[var(--text-primary)]">
                    {getStatusDisplay(lead.status, t)}
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    {timeSince(lead.createdAt, tLeads)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

