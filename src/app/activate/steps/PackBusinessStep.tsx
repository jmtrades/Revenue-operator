"use client";

import { useTranslations } from "next-intl";
import { INDUSTRY_PACKS } from "@/lib/industry-packs";
import type { ActivationState } from "./types";

const PACK_ORDER = Object.keys(INDUSTRY_PACKS).sort((a, b) => {
  // "general" always last
  if (a === "general") return 1;
  if (b === "general") return -1;
  return (INDUSTRY_PACKS[a]?.name ?? a).localeCompare(INDUSTRY_PACKS[b]?.name ?? b);
});

export function PackBusinessStep({
  state,
  setState,
  goNext,
  canGoNext,
}: {
  state: ActivationState;
  setState: React.Dispatch<React.SetStateAction<ActivationState>>;
  goNext: () => void;
  canGoNext: boolean;
}) {
  const t = useTranslations("activate");

  const applyPack = (packId: string) => {
    const pack = INDUSTRY_PACKS[packId];
    if (!pack) return;
    setState((prev) => {
      const name = prev.businessName.trim() || "your business";
      const greeting = pack.greeting.replace(/\{business_name\}/g, name);
      return {
        ...prev,
        industryPackId: packId,
        industry: packId,
        agentTemplate: packId,
        greeting,
        services: [...pack.knowledgeBase.services],
      };
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-50">{t("businessStep.heading")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("businessStep.subtitle")}</p>
      </div>
      <div className="space-y-2">
        <label htmlFor="ab_name" className="block text-xs font-medium text-slate-300">
          {t("businessStep.businessName")}
        </label>
        <input
          id="ab_name"
          type="text"
          value={state.businessName}
          onChange={(e) => {
            const v = e.target.value;
            setState((prev) => {
              const pack = prev.industryPackId ? INDUSTRY_PACKS[prev.industryPackId] : null;
              const greeting = pack
                ? pack.greeting.replace(/\{business_name\}/g, v.trim() || "your business")
                : prev.greeting;
              return { ...prev, businessName: v, greeting };
            });
          }}
          placeholder={t("businessStep.businessNamePlaceholder")}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-[var(--border-default)] focus:outline-none focus:ring-1 focus:ring-[var(--border-default)]"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="ab_industry" className="block text-xs font-medium text-slate-300">
          {t("businessStep.industry")}
        </label>
        <select
          id="ab_industry"
          value={state.industryPackId ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            if (id) applyPack(id);
          }}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 focus:border-[var(--border-default)] focus:outline-none focus:ring-1 focus:ring-[var(--border-default)]"
        >
          <option value="">{t("businessStep.selectIndustry")}</option>
          {PACK_ORDER.map((id) => (
            <option key={id} value={id}>
              {INDUSTRY_PACKS[id]?.name ?? id}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="ab_loc" className="block text-xs font-medium text-slate-300">
          {t("businessStep.cityRegion")}
        </label>
        <input
          id="ab_loc"
          type="text"
          value={state.businessLocation}
          onChange={(e) => setState((p) => ({ ...p, businessLocation: e.target.value }))}
          placeholder={t("businessStep.cityRegionPlaceholder")}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-[var(--border-default)] focus:outline-none focus:ring-1 focus:ring-[var(--border-default)]"
        />
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          className="rounded-xl bg-[var(--bg-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          {t("continue")}
        </button>
      </div>
    </div>
  );
}
