"use client";

import { INDUSTRY_PACKS } from "@/lib/industry-packs";
import type { ActivationState } from "./types";

const PACK_ORDER = ["dental", "hvac", "legal", "medspa", "roofing", "general"] as const;

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
        <h2 className="text-lg md:text-xl font-semibold text-slate-50">Your business</h2>
        <p className="mt-1 text-sm text-slate-400">Step 2 of 5</p>
      </div>
      <div className="space-y-2">
        <label htmlFor="ab_name" className="block text-xs font-medium text-slate-300">
          Business name
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
          placeholder="Acme Dental"
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="ab_industry" className="block text-xs font-medium text-slate-300">
          Industry
        </label>
        <select
          id="ab_industry"
          value={state.industryPackId ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            if (id) applyPack(id);
          }}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">Select industry…</option>
          {PACK_ORDER.map((id) => (
            <option key={id} value={id}>
              {INDUSTRY_PACKS[id]?.name ?? id}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="ab_loc" className="block text-xs font-medium text-slate-300">
          City / region
        </label>
        <input
          id="ab_loc"
          type="text"
          value={state.businessLocation}
          onChange={(e) => setState((p) => ({ ...p, businessLocation: e.target.value }))}
          placeholder="Austin, TX"
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-slate-100 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
