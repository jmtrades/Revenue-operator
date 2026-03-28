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

interface PipelineFunnelProps {
  workspaceId: string;
}

const COLORS = [
  "from-blue-500 to-blue-600",
  "from-blue-500 via-purple-500 to-purple-600",
  "from-purple-500 via-pink-500 to-emerald-600",
  "from-pink-500 via-emerald-500 to-emerald-600",
  "from-emerald-500 to-emerald-600",
];

const RECOVERY_TIPS: Record<string, string> = {
  "New→Contacted": "Increase follow-up speed and personalization",
  "Contacted→Qualified": "Improve qualification questions and discovery",
  "Qualified→Booked": "Strengthen booking scripts and urgency",
  "Booked→Won": "Add no-show recovery and closing tactics",
};

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

        if (data.pipeline && Array.isArray(data.pipeline)) {
          for (const lead of data.pipeline) {
            const mappedStage = stateMap[lead.state] || lead.state;
            if (mappedStage in stageCounts) {
              stageCounts[mappedStage]++;
            }
          }
        }

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
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-6">{t("title")}</p>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t("title")}</p>
        <p className="text-sm text-[var(--accent-red)] text-center py-8">{error}</p>
      </div>
    );
  }

  if (!stages.length || stages[0].count === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t("title")}</p>
        <p className="text-sm text-[var(--text-secondary)] text-center py-8">{t("empty")}</p>
      </div>
    );
  }

  let biggestDropoffIndex = 0;
  let biggestDropoff = 0;
  for (let i = 1; i < stages.length; i++) {
    const dropoff = 100 - stages[i].pct;
    if (dropoff > biggestDropoff) {
      biggestDropoff = dropoff;
      biggestDropoffIndex = i;
    }
  }

  const totalLeads = stages[0].count;
  const wonLeads = stages[4].count;
  const overallConversion = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
  const avgDealValue = 250;
  const potentialRevenue = wonLeads * avgDealValue;

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-6">{t("title")}</h3>

      <div className="space-y-0.5 mb-8">
        {stages.map((stage, index) => {
          const isFirst = index === 0;
          const funnelWidth = 100 - index * 15;
          const conversionRate = stage.pct;
          const dropoffRate = 100 - conversionRate;
          const nextStage = stages[index + 1];
          const dropoffKey = `${stage.stage}→${nextStage?.stage}`;
          const isLeakagePoint = index === biggestDropoffIndex && index > 0;

          return (
            <div key={stage.stage} className="flex flex-col">
              <div className={`flex items-center justify-center transition-all duration-300 mb-1`}>
                <div
                  className={`relative h-14 rounded-lg overflow-hidden shadow-lg transition-all duration-300 bg-gradient-to-r ${COLORS[index]} border border-white/20 hover:shadow-xl`}
                  style={{ width: `${funnelWidth}%` }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-xs font-bold text-white drop-shadow-md">
                      {stage.stage}
                    </div>
                    <div className="text-[11px] font-semibold text-white/90 drop-shadow-sm">
                      {stage.count} leads
                    </div>
                  </div>
                </div>
              </div>

              {index < stages.length - 1 && (
                <div className="flex items-center justify-center my-0.5">
                  <div className="w-0.5 h-3 bg-gradient-to-b from-[var(--border-default)] to-transparent" />
                </div>
              )}

              {index < stages.length - 1 && (
                <div
                  className={`flex items-center justify-center text-xs font-medium rounded-md py-1.5 px-2 mx-auto ${
                    isLeakagePoint
                      ? "bg-amber-500/15 border border-amber-500/50 text-amber-600 dark:text-amber-400"
                      : "bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-secondary)]"
                  }`}
                >
                  <span>{Math.round(conversionRate)}% advance</span>
                  <span className="mx-1.5">•</span>
                  <span className="font-semibold">{Math.round(dropoffRate)}% drop</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {biggestDropoff > 0 && (
        <div className="mb-6 p-4 rounded-lg border border-amber-500/50 bg-amber-500/10 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center mt-0.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                Biggest Leak: {Math.round(biggestDropoff)}% drop-off
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80 leading-relaxed">
                {stages[biggestDropoffIndex - 1]?.stage} → {stages[biggestDropoffIndex]?.stage}
              </p>
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-2">
                💡 {RECOVERY_TIPS[`${stages[biggestDropoffIndex - 1]?.stage}→${stages[biggestDropoffIndex]?.stage}`]}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--border-default)]">
        <div className="text-center">
          <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider font-medium mb-1">
            Conversion
          </p>
          <p className="text-xl font-bold text-emerald-500">
            {overallConversion.toFixed(1)}%
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {totalLeads} → {wonLeads}
          </p>
        </div>

        <div className="text-center border-l border-r border-[var(--border-default)]">
          <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider font-medium mb-1">
            Pipeline
          </p>
          <p className="text-xl font-bold text-blue-500">
            ${totalLeads}k
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            leads in motion
          </p>
        </div>

        <div className="text-center">
          <p className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider font-medium mb-1">
            Potential
          </p>
          <p className="text-xl font-bold text-purple-500">
            ${(potentialRevenue / 1000).toFixed(1)}k
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            @ ${avgDealValue}/deal
          </p>
        </div>
      </div>
    </div>
  );
}
