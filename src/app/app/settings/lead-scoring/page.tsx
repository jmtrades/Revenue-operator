"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { LeadScoringConfig } from "@/lib/lead-scoring";

function getConfigKeys(t: (k: string) => string): { key: keyof LeadScoringConfig; label: string; help?: string }[] {
  return [
    { key: "baseScore", label: t("leadScoring.weights.baseScore"), help: t("leadScoring.weights.baseScoreHelp") },
    { key: "callCount", label: t("leadScoring.weights.callCount") },
    { key: "durationOver2Min", label: t("leadScoring.weights.durationOver2Min") },
    { key: "positiveSentiment", label: t("leadScoring.weights.positiveSentiment") },
    { key: "pricingQuestion", label: t("leadScoring.weights.pricingQuestion") },
    { key: "booked", label: t("leadScoring.weights.booked") },
    { key: "returnCaller", label: t("leadScoring.weights.returnCaller") },
    { key: "negativeSentiment", label: t("leadScoring.weights.negativeSentiment") },
    { key: "justBrowsing", label: t("leadScoring.weights.justBrowsing") },
  ];
}

export default function AppSettingsLeadScoringPage() {
  const tSettings = useTranslations("settings");
  const configKeys = getConfigKeys(tSettings);
  const tToast = useTranslations("toast");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<LeadScoringConfig>({});
  const [defaults, setDefaults] = useState<Required<LeadScoringConfig>>({
    baseScore: 50,
    callCount: 10,
    durationOver2Min: 15,
    positiveSentiment: 20,
    pricingQuestion: 15,
    booked: 25,
    returnCaller: 20,
    negativeSentiment: -15,
    justBrowsing: -10,
    demoCallBase: 15,
    demoHighEngagement: 25,
    demoMediumEngagement: 12,
    demoRepeatCaller: 10,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/workspace/lead-scoring-config", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load");
        const data = (await res.json()) as { config?: LeadScoringConfig; defaults?: Required<LeadScoringConfig> };
        setConfig(data.config ?? {});
        if (data.defaults) setDefaults(data.defaults);
      } catch {
        toast.error(tSettings("leadScoring.loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, [tSettings]);

  const update = (key: keyof LeadScoringConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const resetToDefault = (key: keyof LeadScoringConfig) => {
    const d = defaults[key];
    if (d !== undefined) update(key, d);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/lead-scoring-config", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(tSettings("leadScoring.saved"));
    } catch {
      toast.error(tToast("error.generic"));
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = () => {
    setConfig({});
    toast.success(tSettings("leadScoring.usingDefaults"));
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[{ label: tSettings("title"), href: "/app/settings" }, { label: tSettings("leadScoring.title") }]} />
      <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{tSettings("leadScoring.title")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        {tSettings("leadScoring.description")}
      </p>

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">{tSettings("leadScoring.loading")}</p>
      ) : (
        <div className="space-y-4">
          {configKeys.map(({ key, label, help }) => {
            const value = config[key] ?? defaults[key];
            const isNumber = typeof value === "number";
            return (
              <div key={key} className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{label}</label>
                  {help && <p className="text-[11px] text-[var(--text-secondary)] mb-1">{help}</p>}
                  <input
                    type="number"
                    value={isNumber ? value : ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? (defaults[key] as number) : Number(e.target.value);
                      if (!Number.isNaN(v)) update(key, v);
                    }}
                    className="w-full max-w-[100px] px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => resetToDefault(key)}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {tSettings("leadScoring.resetToDefault", { value: String(defaults[key]) })}
                </button>
              </div>
            );
          })}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-3 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {saving ? tSettings("leadScoring.saving") : tSettings("leadScoring.saveWeights")}
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              className="px-4 py-3 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-inset)]/50"
            >
              {tSettings("leadScoring.useAllDefaults")}
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-[var(--text-secondary)]">
        <Link href="/app/leads" className="underline hover:text-[var(--text-secondary)]">{tSettings("leadScoring.viewLeadsLink")}</Link>
        {tSettings("leadScoring.viewLeadsHintSuffix")}
      </p>
    </div>
  );
}
