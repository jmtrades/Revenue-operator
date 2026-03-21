"use client";

import { useTranslations } from "next-intl";
import { User, Building2, Users } from "lucide-react";
import type { ActivationState, OrgTypeId } from "./types";

const getModes = (t: ReturnType<typeof useTranslations>): { id: OrgTypeId; title: string; subtitle: string; Icon: typeof User }[] => [
  { id: "solo", title: t("modeStep.solo"), subtitle: t("modeStep.soloDesc"), Icon: User },
  { id: "business", title: t("modeStep.serviceBusiness"), subtitle: t("modeStep.serviceBusinessDesc"), Icon: Building2 },
  { id: "agency", title: t("modeStep.agency"), subtitle: t("modeStep.agencyDesc"), Icon: Users },
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
  const t = useTranslations("activate");
  const MODES = getModes(t);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-50">{t("modeStep.heading")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("modeStep.subtitle")}</p>
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
          {t("continue")}
        </button>
      </div>
    </div>
  );
}
