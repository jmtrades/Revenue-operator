"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Phone, ArrowRight } from "lucide-react";
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
  const t = useTranslations("activate");
  const [touched, setTouched] = useState(false);

  const digits = state.businessPhone.replace(/\D/g, "");
  const isValidPhone = digits.length >= 10 && digits.length <= 15 && !/^0+$/.test(digits);
  const showError = touched && state.businessPhone.trim().length > 0 && !isValidPhone;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-50">{t("phoneStep.heading")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("phoneStep.subtitle")}</p>
      </div>
      <div className="space-y-2">
        <label htmlFor="ph_main" className="block text-xs font-medium text-slate-300">
          {t("phoneStep.phoneNumber")}
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="ph_main"
            type="tel"
            value={state.businessPhone}
            onChange={(e) => setState((p) => ({ ...p, businessPhone: e.target.value }))}
            onBlur={() => setTouched(true)}
            placeholder="+1 (555) 000-0000"
            className={`w-full rounded-xl border bg-slate-900/60 pl-9 pr-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 ${
              showError
                ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/40"
                : "border-slate-700 focus:border-[var(--border-default)] focus:ring-[var(--border-default)]"
            }`}
          />
        </div>
        {showError && (
          <p className="text-xs text-red-400">{t("phoneStep.invalidPhone", { defaultValue: "Please enter a valid phone number (10-15 digits)" })}</p>
        )}
        <p className="text-xs text-slate-500">{t("phoneStep.phoneHint", { defaultValue: "Your business phone number. We'll forward calls to your AI agent." })}</p>
      </div>
      <div className="flex items-center justify-between gap-3 pt-2">
        <button type="button" onClick={goBack} className="text-sm text-slate-400 hover:text-[var(--text-primary)]">
          {t("back")}
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goNext}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {t("phoneStep.skipForNow", { defaultValue: "Skip for now" })}
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--bg-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
          >
            {t("continue")}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
