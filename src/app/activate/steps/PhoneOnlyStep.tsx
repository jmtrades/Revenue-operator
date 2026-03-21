"use client";

import type { ActivationState } from "./types";

export function PhoneOnlyStep({
  state,
  setState,
  goNext,
  goBack,
  canGoNext,
}: {
  state: ActivationState;
  setState: React.Dispatch<React.SetStateAction<ActivationState>>;
  goNext: () => void;
  goBack: () => void;
  canGoNext: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-50">Connect your phone</h2>
        <p className="mt-1 text-sm text-slate-400">Step 3 of 5 — your main business number or one we&apos;ll forward to.</p>
      </div>
      <div className="space-y-2">
        <label htmlFor="ph_main" className="block text-xs font-medium text-slate-300">
          Phone number
        </label>
        <input
          id="ph_main"
          type="tel"
          value={state.businessPhone}
          onChange={(e) => setState((p) => ({ ...p, businessPhone: e.target.value }))}
          placeholder="+1 (555) 000-0000"
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-[var(--border-default)] focus:outline-none focus:ring-1 focus:ring-[var(--border-default)]"
        />
      </div>
      <div className="flex items-center justify-between gap-3 pt-2">
        <button type="button" onClick={goBack} className="text-sm text-slate-400 hover:text-[var(--text-primary)]">
          Back
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          className="rounded-xl bg-[var(--bg-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
