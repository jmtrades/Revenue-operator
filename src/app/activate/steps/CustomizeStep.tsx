"use client";

import { useTranslations } from "next-intl";
import { SUPPORTED_LANGUAGES } from "@/lib/constants/languages";
import type { ActivationState, ElevenLabsVoice } from "./types";

export function CustomizeStep({
  state,
  setState,
  voices,
  industryServices,
  effectiveServices,
  onPlayGreeting,
  goBack,
  goNext,
  canGoNext,
}: {
  state: ActivationState;
  setState: React.Dispatch<React.SetStateAction<ActivationState>>;
  voices: ElevenLabsVoice[];
  industryServices: string[];
  effectiveServices: string[];
  onPlayGreeting: () => void;
  goBack: () => void;
  goNext: () => void;
  canGoNext: boolean;
}) {
  const t = useTranslations("activate.customize");
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-slate-50">{t("heading")}</h2>
          <p className="mt-1 text-sm text-slate-400">{t("subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="agent_name" className="block text-xs font-medium text-slate-300">{t("agentNameLabel")}</label>
          <input
            id="agent_name"
            type="text"
            value={state.agentName}
            onChange={(e) => setState((prev) => ({ ...prev, agentName: e.target.value }))}
            placeholder={t("agentNamePlaceholder")}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="preferred_language" className="block text-xs font-medium text-slate-300">{t("preferredLanguageLabel")}</label>
          <select
            id="preferred_language"
            value={state.preferredLanguage}
            onChange={(e) => setState((prev) => ({ ...prev, preferredLanguage: e.target.value }))}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">{t("languageHint")}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="agent_voice" className="block text-xs font-medium text-slate-300">{t("voiceLabel")}</label>
          <select
            id="agent_voice"
            value={state.voiceId}
            onChange={(e) => setState((prev) => ({ ...prev, voiceId: e.target.value }))}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          >
            {voices.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">{t("voiceHint")}</p>
        </div>
        <div className="space-y-2">
          <p className="block text-xs font-medium text-slate-300">{t("keyServicesLabel")}</p>
          <div className="flex flex-wrap gap-1.5">
            {industryServices.map((svc) => {
              const isOn = effectiveServices.includes(svc);
              return (
                <button
                  key={svc}
                  type="button"
                  onClick={() =>
                    setState((prev) => {
                      const exists = prev.services.includes(svc);
                      const next = exists ? prev.services.filter((s) => s !== svc) : [...prev.services, svc];
                      return { ...prev, services: next };
                    })
                  }
                  className={`rounded-full border px-3 py-1 text-[11px] md:text-xs transition-colors ${
                    isOn ? "border-white/50 bg-white/10 text-slate-50" : "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {svc}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-300">{t("businessHoursLabel")}</p>
        <div className="grid gap-2">
          {state.hours.map((slot, idx) => (
            <div key={slot.day} className="flex items-center gap-3 text-xs text-slate-300">
              <div className="w-10 text-slate-400">{slot.day}</div>
              <button
                type="button"
                onClick={() =>
                  setState((prev) => {
                    const next = [...prev.hours];
                    next[idx] = { ...next[idx], enabled: !next[idx].enabled };
                    return { ...prev, hours: next };
                  })
                }
                className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] ${
                  slot.enabled ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-900/40 text-slate-400"
                }`}
              >
                {slot.enabled ? t("open") : t("closed")}
              </button>
              <div className="flex items-center gap-1.5">
                <select
                  value={slot.start}
                  onChange={(e) =>
                    setState((prev) => {
                      const next = [...prev.hours];
                      next[idx] = { ...next[idx], start: e.target.value };
                      return { ...prev, hours: next };
                    })
                  }
                  disabled={!slot.enabled}
                  className="rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-[11px] text-slate-100 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                >
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                </select>
                <span className="text-slate-500">–</span>
                <select
                  value={slot.end}
                  onChange={(e) =>
                    setState((prev) => {
                      const next = [...prev.hours];
                      next[idx] = { ...next[idx], end: e.target.value };
                      return { ...prev, hours: next };
                    })
                  }
                  disabled={!slot.enabled}
                  className="rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-[11px] text-slate-100 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                >
                  <option value="17:00">5:00 PM</option>
                  <option value="18:00">6:00 PM</option>
                  <option value="19:00">7:00 PM</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="greeting" className="block text-xs font-medium text-slate-300">{t("greetingLabel")}</label>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60">
          <textarea
            id="greeting"
            rows={3}
            value={state.greeting}
            onChange={(e) => setState((prev) => ({ ...prev, greeting: e.target.value }))}
            className="w-full resize-none rounded-xl bg-transparent px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none"
            placeholder={t("greetingPlaceholder", { business: state.businessName || "your business" })}
          />
          <div className="flex items-center justify-between px-3 pb-2 text-[11px] text-slate-500">
            <span>{state.greeting.length} {t("characters")}</span>
            <button type="button" className="text-zinc-400 hover:text-white" onClick={onPlayGreeting}>
              {t("previewVoice")}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button type="button" onClick={goBack} className="text-xs md:text-sm text-slate-400 hover:text-slate-100">{t("back")}</button>
        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-xs md:text-sm font-semibold text-black hover:bg-slate-100 disabled:opacity-60"
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
