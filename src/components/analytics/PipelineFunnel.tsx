"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiFetch, ApiError } from "@/lib/api";

interface PipelineStage {
  stage: string;
  count: number;
  pct: number;
}

interface PipelineData {
  stages: PipelineStage[];
}

interface PipelineFunnelProps {
  workspaceId: string;
}

export function PipelineFunnel({ workspaceId }: PipelineFunnelProps) {
  const t = useTranslations("pipeline");
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await apiFetch<{
          pipeline: Array<{ state: string }>;
        }>(`/api/pipeline?workspace_id=${encodeURIComponent(workspaceId)}`);

        if (!active) return;

        // Map pipeline states to funnel stages
        const stateMap: Record<string, string> = {
          new: "New",
          contacted: "Contacted",
          qualified: "Qualified",
          appointment_set: "Booked",
          won: "Won",
        };

        const stageCounts: Record<string, number> = {
          New: 0,
          Contacted: 0,
          Qualified: 0,
          Booked: 0,
          Won: 0,
        };

        // Count leads in each state
        if (data.pipeline && Array.isArray(data.pipeline)) {
          for (const lead of data.pipeline) {
            const mappedStage = stateMap[lead.state] || lead.state;
            if (mappedStage in stageCounts) {
              stageCounts[mappedStage]++;
            }
          }
        }

        // Calculate percentages and drop-off rates
        const total = Object.values(stageCounts).reduce((a, b) => a + b, 0);
        const funnelStages: PipelineStage[] = [
          { stage: "New", count: stageCounts.New, pct: 100 },
          {
            stage: "Contacted",
            count: stageCounts.Contacted,
            pct: stageCounts.New > 0 ? (stageCounts.Contacted / stageCounts.New) * 100 : 0,
          },
          {
            stage: "Qualified",
            count: stageCounts.Qualified,
            pct: stageCounts.Contacted > 0 ? (stageCounts.Qualified / stageCounts.Contacted) * 100 : 0,
          },
          {
            stage: "Booked",
            count: stageCounts.Booked,
            pct: stageCounts.Qualified > 0 ? (stageCounts.Booked / stageCounts.Qualified) * 100 : 0,
          },
          {
            stage: "Won",
            count: stageCounts.Won,
            pct: stageCounts.Booked > 0 ? (stageCounts.Won / stageCounts.Booked) * 100 : 0,
          },
        ];

        setStages(funnelStages);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load pipeline data");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-4">{t("title")}</p>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-4">{t("title")}</p>
        <p className="text-sm text-[var(--accent-red)] text-center py-8">{error}</p>
      </div>
    );
  }

  if (!stages.length || stages[0].count === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-4">{t("title")}</p>
        <p className="text-sm text-[var(--text-secondary)] text-center py-8">
          {t("empty")}
        </p>
      </div>
    );
  }

  // Find the biggest drop-off stage
  let biggestDropoffIndex = 0;
  let biggestDropoff = 100;
  for (let i = 1; i < stages.length; i++) {
    const dropoff = 100 - stages[i].pct;
    if (dropoff > biggestDropoff) {
      biggestDropoff = dropoff;
      biggestDropoffIndex = i;
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5">
      <p className="text-sm font-medium text-[var(--text-primary)] mb-4">{t("title")}</p>

      <div className="space-y-3">
        {stages.map((stage, index) => {
          const widthPct = (stage.count / Math.max(1, stages[0].count)) * 100;
          const isLeakagePoint = index > 0 && index === biggestDropoffIndex;
          const dropoffPct = index > 0 ? 100 - stage.pct : 0;

          return (
            <div key={stage.stage} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text-primary)]">{stage.stage}</span>
                <span className="text-[var(--text-secondary)]">{stage.count}</span>
              </div>

              <div className="relative h-10 rounded-lg bg-[var(--bg-input)]/50 overflow-hidden border border-[var(--border-default)]">
                <div
                  className={`h-full transition-all rounded-lg flex items-center px-3 ${
                    isLeakagePoint
                      ? "bg-[#EF4444]/20 border-r-2 border-[#EF4444]"
                      : "bg-[var(--accent-primary)]/20"
                  }`}
                  style={{ width: `${Math.max(5, widthPct)}%` }}
                >
                  <span className="text-[10px] font-semibold text-[var(--text-primary)] truncate">
                    {Math.round(widthPct)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                {index > 0 && (
                  <>
                    <span>{t("fromPrevious", { pct: Math.round(stage.pct) })}</span>
                    {isLeakagePoint && (
                      <span className="font-semibold text-[#EF4444]">
                        {t("leakage", { pct: Math.round(dropoffPct) })}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {biggestDropoff > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-[#FEE2E2] border border-[#FECACA]">
          <p className="text-xs font-medium text-[#991B1B] mb-1">{t("biggestLeakagePoint")}</p>
          <p className="text-xs text-[#7F1D1D]">
            {t("leakageDescription", {
              pct: Math.round(biggestDropoff),
              from: stages[biggestDropoffIndex - 1]?.stage,
              to: stages[biggestDropoffIndex].stage
            })}
          </p>
        </div>
      )}
    </div>
  );
}
