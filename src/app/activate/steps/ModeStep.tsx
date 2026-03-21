"use client";

import { User, Building2, Users } from "lucide-react";
import type { ActivationState } from "./types";

const MODES: { id: NonNullable<ActivationState["orgType"]>; title: string; subtitle: string; Icon: typeof User }[] = [
  { id: "solo", title: "Solo", subtitle: "Owner-operator", Icon: User },
  { id: "business", title: "Service business", subtitle: "Single location team", Icon: Building2 },
  { id: "agency", title: "Agency", subtitle: "Managing client workspaces", Icon: Users },
];

export function ModeStep({
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
        <h2 className="text-lg md:text-xl font-semibold text-slate-50">What best describes you?</h2>
        <p className="mt-1 text-sm text-slate-400">Step 1 of 5 — we&apos;ll tailor your setup.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.map(({ id, title, subtitle, Icon }) => {
          const selected = state.orgType === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setState((p) => ({ ...p, orgType: id }))}
              className={`rounded-2xl border p-4 text-left transition-all ${
                selected ? "border-white bg-white/10 ring-1 ring-white" : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
              }`}
            >
              <Icon className="h-8 w-8 text-slate-200 mb-2" aria-hidden />
              <p className="font-semibold text-slate-50">{title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end pt-2">
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
