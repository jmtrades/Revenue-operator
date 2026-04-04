"use client";

import { useTranslations } from "next-intl";
import type { Agent } from "../AgentsPageClient";
import { RulesTab } from "../AgentsPageClient";
import {
  detectIndustry,
  getObjectionTemplates,
  type IndustryType,
} from "@/lib/objection-templates";

type BehaviorStepContentProps = {
  agent: Agent;
  onChange: (p: Partial<Agent>) => void;
  onBack: () => void;
  onNext: () => void;
};

export function BehaviorStepContent({
  agent,
  onChange,
  onBack,
  onNext,
}: BehaviorStepContentProps) {
  const t = useTranslations("agents");
  const tCommon = useTranslations("common");
  const NEVER_DO_PRESETS = [
    t("behavior.presets.noPricing"),
    t("behavior.presets.noAfterHours"),
    t("behavior.presets.noPromises"),
    t("behavior.presets.noCompetitors"),
    t("behavior.presets.noInternal"),
  ];

  // Phone number validation helper
  const isValidPhoneNumber = (phone: string): boolean => {
    if (!phone) return true; // Allow empty (optional field)
    // Match: starts with + or is 10+ digits
    return /^(\+|[0-9]{10,})/.test(phone.replace(/\D/g, "") || phone);
  };

  const transferPhoneError = agent.transferPhone && !isValidPhoneNumber(agent.transferPhone);

  const neverDo = Array.isArray(agent.neverSay) ? agent.neverSay : [];

  const addNeverDo = (rule: string) => {
    if (!rule.trim() || neverDo.includes(rule)) return;
    onChange({ neverSay: [...neverDo, rule] });
  };

  const removeNeverDo = (rule: string) => {
    onChange({ neverSay: neverDo.filter((r) => r !== rule) });
  };

  const qualificationQuestions = Array.isArray(agent.qualificationQuestions)
    ? agent.qualificationQuestions
    : [];

  const updateQuestion = (index: number, value: string) => {
    const next = [...qualificationQuestions];
    next[index] = value;
    onChange({
      qualificationQuestions: next
        .map((q) => q.trim())
        .filter((q, i) => q || i === index),
    });
  };

  const removeQuestion = (index: number) => {
    const next = qualificationQuestions.filter((_, i) => i !== index);
    onChange({ qualificationQuestions: next });
  };

  const addQuestion = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onChange({ qualificationQuestions: [...qualificationQuestions, trimmed] });
  };

  const objections = agent.objectionHandling ?? {};

  const setObjection = (
    id: "price" | "timing" | "competitor" | "notInterested",
    value: string,
  ) => {
    onChange({
      objectionHandling: {
        ...objections,
        [id]: value,
      },
    });
  };

  // Auto-generate objection responses based on industry
  const generateObjectionResponse = (objectionType: "price" | "timing" | "competitor" | "notInterested") => {
    const detectedIndustry = detectIndustry(
      agent.businessContext,
      agent.services?.join(", "),
    ) as IndustryType;
    const templates = getObjectionTemplates(detectedIndustry);
    setObjection(objectionType, templates[objectionType]);
  };

  const autoFillAllObjections = () => {
    const detectedIndustry = detectIndustry(
      agent.businessContext,
      agent.services?.join(", "),
    ) as IndustryType;
    const templates = getObjectionTemplates(detectedIndustry);
    onChange({
      objectionHandling: {
        price: templates.price,
        timing: templates.timing,
        competitor: templates.competitor,
        notInterested: templates.notInterested,
      },
    });
  };

  return (
    <div className="space-y-6">
      <h3 id="behavior-heading" className="text-sm font-semibold text-[var(--text-primary)]">{t("behavior.title")}</h3>
      <section
        aria-label="Guardrails"
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3"
      >
        <div>
          <p className="text-xs font-semibold text-white/80">
            {t("behavior.neverDoTitle")}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            {t("behavior.neverDoHint")}
          </p>
        </div>
        <div className="space-y-1.5">
          {NEVER_DO_PRESETS.map((rule) => (
            <label
              key={rule}
              className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-input)] cursor-pointer"
                checked={neverDo.includes(rule)}
                onChange={(e) =>
                  e.target.checked ? addNeverDo(rule) : removeNeverDo(rule)
                }
              />
              <span>{rule}</span>
            </label>
          ))}
        </div>
        <div className="pt-2">
          <label
            htmlFor="custom-never-do"
            className="block text-[11px] text-[var(--text-tertiary)] mb-1"
          >
            {t("behavior.customRuleLabel")}
          </label>
          <input
            id="custom-never-do"
            type="text"
            placeholder={t("behavior.customRulePlaceholder")}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = e.currentTarget.value.trim();
                if (value) {
                  addNeverDo(value);
                  e.currentTarget.value = "";
                }
              }
            }}
          />
        </div>
      </section>
      <RulesTab agent={agent} onChange={onChange} />
      <section className="mt-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
          {t("behavior.qualTitle")}
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mb-2">
          {t("behavior.qualHint")}
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[var(--text-tertiary)]">{t("behavior.presetLabel")}</span>
          {(["bant", "meddic", "custom"] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                if (preset === "custom") {
                  onChange({});
                  return;
                }
                const next =
                  preset === "bant"
                    ? [t("behavior.bant.q1"), t("behavior.bant.q2"), t("behavior.bant.q3"), t("behavior.bant.q4")]
                    : [t("behavior.meddic.q1"), t("behavior.meddic.q2"), t("behavior.meddic.q3"), t("behavior.meddic.q4")];
                onChange({ qualificationQuestions: next });
              }}
              className={`px-2.5 py-1 rounded-full border text-[11px] ${
                preset === "custom"
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-on-accent)]"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]"
              }`}
            >
              {preset === "bant"
                ? "BANT"
                : preset === "meddic"
                  ? "MEDDIC"
                  : "Custom"}
            </button>
          ))}
        </div>

        {(qualificationQuestions || []).map((q, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <span className="text-xs text-white/20 w-5">{i + 1}.</span>
            <input
              value={q}
              onChange={(e) => updateQuestion(i, e.target.value)}
              className="flex-1 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--border-default)] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => removeQuestion(i)}
              className="text-xs text-white/20 hover:text-[var(--accent-danger,#ef4444)] p-1"
            >
              {t("behavior.remove")}
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => addQuestion("")}
          className="mt-2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          {t("behavior.addQuestion")}
        </button>

        {qualificationQuestions.length === 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {[t("behavior.placeholderQ1"), t("behavior.placeholderQ2"), t("behavior.placeholderQ3"), t("behavior.placeholderQ4")].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => addQuestion(preset)}
                className="text-xs px-3 py-1.5 border border-[var(--border-default)] rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-inset)]"
              >
                {preset}
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
              {t("behavior.objectionTitle")}
            </h3>
            <p className="text-xs text-[var(--text-tertiary)]">
              {t("behavior.objectionHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={autoFillAllObjections}
            className="ml-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/20 transition-colors whitespace-nowrap"
            title="Auto-fill all objection responses based on your business context"
          >
            Auto-fill all
          </button>
        </div>

        <div className="space-y-3">
          {[
            { id: "price" as const, labelKey: "objectionPriceLabel" as const, placeholderKey: "objectionPricePlaceholder" as const },
            { id: "timing" as const, labelKey: "objectionTimingLabel" as const, placeholderKey: "objectionTimingPlaceholder" as const },
            { id: "competitor" as const, labelKey: "objectionCompetitorLabel" as const, placeholderKey: "objectionCompetitorPlaceholder" as const },
            { id: "notInterested" as const, labelKey: "objectionNotInterestedLabel" as const, placeholderKey: "objectionNotInterestedPlaceholder" as const },
          ].map((obj) => (
            <div key={obj.id}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[var(--text-tertiary)]">
                  {t(`behavior.${obj.labelKey}`)}
                </label>
                <button
                  type="button"
                  onClick={() => generateObjectionResponse(obj.id)}
                  className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] underline transition-colors"
                  title={`Generate suggested response for ${obj.id} objection`}
                >
                  Generate
                </button>
              </div>
              <textarea
                value={(objections as Record<string, string | undefined>)[obj.id] ?? ""}
                onChange={(e) => setObjection(obj.id, e.target.value)}
                rows={2}
                placeholder={t(`behavior.${obj.placeholderKey}`)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-white/20 focus:border-[var(--border-default)] focus:outline-none resize-none"
              />
            </div>
          ))}
        </div>
      </section>
      <section className="mt-6">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
          {t("behavior.escalationTitle")}
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mb-3">
          {t("behavior.escalationHint")}
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--text-tertiary)] mb-1 block">
              {t("behavior.transferPhoneLabel")}
            </label>
            <input
              value={agent.transferPhone || ""}
              onChange={(e) => onChange({ transferPhone: e.target.value })}
              placeholder={t("behavior.transferPhonePlaceholder")}
              className={`w-full bg-[var(--bg-input)] border rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-white/25 focus:outline-none ${
                transferPhoneError
                  ? "border-[var(--accent-danger,#ef4444)]/50 focus:border-[var(--accent-danger,#ef4444)]/70"
                  : "border-[var(--border-default)] focus:border-[var(--border-default)]"
              }`}
            />
            {transferPhoneError && (
              <p className="text-xs text-[var(--accent-danger,#ef4444)] mt-1">
                Phone number must start with + or contain 10+ digits
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-[var(--text-tertiary)] mb-1 block">
              {t("behavior.transferWhen")}
            </label>
            <div className="space-y-1.5">
              {([
                "asksForManager",
                "angry",
                "complexQuestion",
                "requestsHuman",
                "emergency",
              ] as const).map((id) => (
                <label
                  key={id}
                  className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)]"
                >
                  <input
                    type="checkbox"
                    className="rounded border-[var(--border-default)] bg-transparent"
                    checked={(agent.escalationTriggers || []).includes(id)}
                    onChange={(e) => {
                      const current = agent.escalationTriggers || [];
                      const updated = e.target.checked
                        ? [...current, id]
                        : current.filter((tr) => tr !== id);
                      onChange({ escalationTriggers: updated });
                    }}
                  />
                  {t(`behavior.escalation.${id}`)}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} aria-label={t("nav.backToKnowledge")} className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black">{tCommon("back")}</button>
        <button type="button" onClick={onNext} disabled={!!transferPhoneError} aria-label={t("nav.continueToTest")} className={`rounded-xl bg-[var(--bg-surface)] px-6 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black ${transferPhoneError ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`}>{tCommon("continue")}</button>
      </div>
    </div>
  );
}

