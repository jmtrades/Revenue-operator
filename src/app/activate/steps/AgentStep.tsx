"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { previewVoiceViaApi } from "@/lib/voice-preview";
import {
  AGENT_TEMPLATES,
  AGENT_TEMPLATE_CATEGORIES,
  type AgentTemplateCategory,
  type AgentTemplate,
} from "@/lib/data/agent-templates";
import type { ActivationState } from "./types";

export function AgentStep({
  state,
  setState,
  goBack,
  goNext,
  canGoNext,
  getIndustryLabel: getLabel,
}: {
  state: ActivationState;
  setState: React.Dispatch<React.SetStateAction<ActivationState>>;
  goBack: () => void;
  goNext: () => void;
  canGoNext: boolean;
  getIndustryLabel: (id: string | null) => string;
}) {
  const t = useTranslations("activate.agent");
  const [category, setCategory] = useState<AgentTemplateCategory | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = category === "all" ? AGENT_TEMPLATES : AGENT_TEMPLATES.filter((tpl) => tpl.category === category);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((tpl) => tpl.name.toLowerCase().includes(q) || tpl.description.toLowerCase().includes(q) || tpl.styleLabel.toLowerCase().includes(q));
    return list;
  }, [category, search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-50">{t("heading")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("subtitleForIndustry", { industry: getLabel(state.industry).toLowerCase() })}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${category === "all" ? "border-sky-400 bg-sky-500/10 text-slate-50" : "border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500"}`}
        >
          {t("all")}
        </button>
        {AGENT_TEMPLATE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${category === c.id ? "border-sky-400 bg-sky-500/10 text-slate-50" : "border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder={t("searchPlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        aria-label={t("searchAria")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-h-[50vh] overflow-y-auto pr-2">
        {filtered.map((tpl) => {
          const isSelected = state.agentTemplate === tpl.id;
          const initials = tpl.name.replace(/^The\s+/, "").slice(0, 2).toUpperCase();
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  agentTemplate: tpl.id,
                  agentName: prev.agentName || tpl.name.replace(/^The\s+/, ""),
                  greeting: tpl.defaultGreeting,
                  ...((tpl as AgentTemplate).voiceId && { elevenlabsVoiceId: (tpl as AgentTemplate).voiceId! }),
                }))
              }
              className={`flex flex-col items-start gap-2 rounded-2xl border px-4 py-4 text-left text-sm transition-colors ${
                isSelected ? "border-sky-400 bg-sky-500/10" : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
              }`}
            >
              <div className="flex items-center gap-3 w-full min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-50 border border-slate-600">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-50 truncate">{tpl.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{tpl.styleLabel}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{tpl.description}</p>
              <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                {tpl.behaviors.map((b) => (
                  <li key={b} className="flex items-start gap-1.5">
                    <span className="mt-[3px] h-1 w-1 rounded-full bg-sky-400 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-slate-500 mt-1">{t("bestFor")} {tpl.bestFor}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  previewVoiceViaApi(tpl.defaultGreeting, { voiceId: (tpl as AgentTemplate).voiceId, gender: "female" });
                }}
                className="text-[11px] text-sky-400 hover:text-sky-300 mt-1"
              >
                Preview voice ▶
              </button>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() =>
            setState((prev) => ({
              ...prev,
              agentTemplate: "scratch",
              agentName: prev.agentName || t("defaultAgentName"),
              greeting: t("greetingTemplate", { business: prev.businessName || t("yourBusiness") }),
            }))
          }
          className={`flex flex-col justify-center gap-2 rounded-2xl border px-4 py-4 text-left text-sm transition-colors ${
            state.agentTemplate === "scratch" ? "border-sky-400 bg-sky-500/10" : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
          }`}
        >
          <p className="text-sm font-semibold text-slate-50">{t("startFromScratch")}</p>
          <p className="text-xs text-slate-400">{t("startFromScratchDesc")}</p>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button type="button" onClick={goBack} className="text-xs md:text-sm text-slate-400 hover:text-slate-100">{t("back")}</button>
        <button type="button" onClick={goNext} disabled={!canGoNext} className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-xs md:text-sm font-semibold text-black hover:bg-slate-100 disabled:opacity-60">{t("next")}</button>
      </div>
    </div>
  );
}
