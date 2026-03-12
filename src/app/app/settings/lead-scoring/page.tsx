"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { LeadScoringConfig } from "@/lib/lead-scoring";

const CONFIG_KEYS: { key: keyof LeadScoringConfig; label: string; help?: string }[] = [
  { key: "baseScore", label: "Base score (0–100)", help: "Starting score before any events" },
  { key: "callCount", label: "Per call" },
  { key: "durationOver2Min", label: "Call over 2 min" },
  { key: "positiveSentiment", label: "Positive sentiment" },
  { key: "pricingQuestion", label: "Asked about pricing" },
  { key: "booked", label: "Booked appointment" },
  { key: "returnCaller", label: "Return caller" },
  { key: "negativeSentiment", label: "Negative sentiment" },
  { key: "justBrowsing", label: "Just browsing / low intent" },
];

export default function AppSettingsLeadScoringPage() {
  const tSettings = useTranslations("settings");
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
      <Breadcrumbs items={[{ label: "Settings", href: "/app/settings" }, { label: "Lead scoring" }]} />
      <h1 className="text-lg font-semibold text-white mb-2">Lead scoring</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Weights used to compute lead score (0–100) from calls and interactions. Scores recalculate after each call. Omit a key to use the default.
      </p>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          {CONFIG_KEYS.map(({ key, label, help }) => {
            const value = config[key] ?? defaults[key];
            const isNumber = typeof value === "number";
            return (
              <div key={key} className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">{label}</label>
                  {help && <p className="text-[11px] text-zinc-500 mb-1">{help}</p>}
                  <input
                    type="number"
                    value={isNumber ? value : ""}
                    onChange={(e) => {
                      const v = e.target.value === "" ? (defaults[key] as number) : Number(e.target.value);
                      if (!Number.isNaN(v)) update(key, v);
                    }}
                    className="w-full max-w-[100px] px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => resetToDefault(key)}
                  className="text-xs text-zinc-500 hover:text-white"
                >
                  Reset to default ({defaults[key]})
                </button>
              </div>
            );
          })}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save weights"}
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              className="px-4 py-3 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800/50"
            >
              Use all defaults
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-500">
        <Link href="/app/leads" className="underline hover:text-zinc-300">View leads</Link> to see scores. Scores update automatically after each call.
      </p>
    </div>
  );
}
