"use client";

import { useTranslations } from "next-intl";
import { PhoneIncoming, PhoneOutgoing, CalendarCheck, UserPlus, Headphones, Zap } from "lucide-react";
import { GOAL_OPTIONS } from "./types";
import type { ActivationState } from "./types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PhoneIncoming, PhoneOutgoing, CalendarCheck, UserPlus, Headphones, Zap,
};

export function GoalStep({
  state,
  onUpdate,
  onNext,
}: {
  state: ActivationState;
  onUpdate: (patch: Partial<ActivationState>) => void;
  onNext: () => void;
}) {
  const t = useTranslations("activate.goalStep");
  const tActivate = useTranslations("activate");
  const goals = state.goals ?? [];

  const toggle = (id: string) => {
    const next = goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id];
    onUpdate({ goals: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">{t("heading")}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("subtitle")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {GOAL_OPTIONS.map((goal) => {
          const Icon = ICONS[goal.icon] ?? Zap;
          const selected = goals.includes(goal.id);
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => toggle(goal.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                selected
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
                  : "border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-medium)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selected ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]" : "bg-[var(--bg-inset)] text-[var(--text-secondary)]"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${selected ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"}`}>{goal.label}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{goal.desc}</p>
                </div>
              </div>
              {selected && (
                <div className="mt-2 flex justify-end">
                  <span className="text-xs font-medium text-[var(--accent-primary)]">{t("selected")}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={goals.length === 0}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-40 transition-colors"
      >
        {tActivate("continue")}
      </button>
    </div>
  );
}
