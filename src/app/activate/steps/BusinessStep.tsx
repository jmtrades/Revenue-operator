"use client";

import type { ActivationState } from "./types";
import { ORG_TYPES, USE_CASE_OPTIONS } from "./types";
import { INDUSTRY_OPTIONS, getServicesForIndustry } from "@/lib/constants/industries";

export function BusinessStep({
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
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-50">
          Let&apos;s build your AI phone agent.
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          This takes about 3 minutes. You&apos;ll hear your agent handle
          a real call at the end.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="business_name" className="block text-xs font-medium text-slate-300">
            Business name
          </label>
          <input
            id="business_name"
            type="text"
            value={state.businessName}
            onChange={(e) => setState((prev) => ({ ...prev, businessName: e.target.value }))}
            placeholder="Acme Co"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="business_phone" className="block text-xs font-medium text-slate-300">
            Business phone number
          </label>
          <input
            id="business_phone"
            type="tel"
            value={state.businessPhone}
            onChange={(e) => setState((prev) => ({ ...prev, businessPhone: e.target.value }))}
            placeholder="(555) 123-4567"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-300">What will your AI do?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {USE_CASE_OPTIONS.map((opt) => {
            const checked = state.useCases.includes(opt.id);
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-colors ${
                  checked ? "border-sky-400 bg-sky-500/10 text-slate-50" : "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-500"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      useCases: e.target.checked
                        ? [...prev.useCases, opt.id]
                        : prev.useCases.filter((u) => u !== opt.id),
                    }))
                  }
                  className="rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="org_type" className="block text-xs font-medium text-slate-300">Type of organization</label>
        <select
          id="org_type"
          value={state.orgType ?? ""}
          onChange={(e) =>
            setState((prev) => ({
              ...prev,
              orgType: (e.target.value || null) as ActivationState["orgType"],
            }))
          }
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="">Select…</option>
          {ORG_TYPES.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="industry_opt" className="block text-xs font-medium text-slate-300">Industry (optional — helps us suggest a template)</label>
        <select
          id="industry_opt"
          value={state.industry ?? ""}
          onChange={(e) => {
            const val = e.target.value || null;
            setState((prev) => ({
              ...prev,
              industry: val || null,
              services: getServicesForIndustry(val),
            }));
          }}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="">None / Other</option>
          {INDUSTRY_OPTIONS.map((ind) => (
            <option key={ind.id} value={ind.id}>{ind.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <span className="text-xs text-slate-500">You can change this later in Settings.</span>
        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-xs md:text-sm font-semibold text-black hover:bg-slate-100 disabled:opacity-60"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
