"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Headphones,
  PhoneCall,
  PhoneOutgoing,
  Settings,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { Agent, AgentPurpose, PrimaryGoalId } from "../AgentsPageClient";

type IdentityStepContentProps = {
  agent: Agent;
  onChange: (p: Partial<Agent>) => void;
  onNext: () => void;
};

type ExtractedBusinessDetails = {
  businessName: string;
  industry?: string;
  services?: string[];
  location?: string;
  targetAudience?: string;
  faq?: Array<{ question: string; answer: string }>;
};

type ToneId = "professional" | "friendly" | "casual" | "formal";

const PLAYBOOK_ICONS: Record<string, LucideIcon> = {
  receptionist: PhoneCall,
  appointment_setter: Calendar,
  lead_qualifier: UserCheck,
  follow_up: PhoneOutgoing,
  support: Headphones,
  scratch: Settings,
};

const TEMPLATE_IDS = [
  { id: "receptionist" as const, purpose: "inbound" as AgentPurpose, primaryGoal: "answer_route" as PrimaryGoalId },
  { id: "appointment_setter" as const, purpose: "inbound" as AgentPurpose, primaryGoal: "book_appointments" as PrimaryGoalId },
  { id: "lead_qualifier" as const, purpose: "inbound" as AgentPurpose, primaryGoal: "qualify_leads" as PrimaryGoalId },
  { id: "follow_up" as const, purpose: "outbound" as AgentPurpose, primaryGoal: "follow_up" as PrimaryGoalId },
  { id: "support" as const, purpose: "inbound" as AgentPurpose, primaryGoal: "support" as PrimaryGoalId },
  { id: "scratch" as const },
] as const;

function getTemplates(t: (k: string) => string) {
  return TEMPLATE_IDS.map((row) => {
    const id = row.id;
    const label = t(`identity.templates.${id}.label`);
    const desc = t(`identity.templates.${id}.desc`);
    const greeting = id !== "scratch" ? t(`identity.templates.${id}.greeting`) : undefined;
    const defaults = "purpose" in row && row.purpose
      ? { purpose: row.purpose, primaryGoal: row.primaryGoal!, greeting }
      : {};
    return { id, label, desc, defaults };
  });
}

function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function IdentityStepContent({ agent, onChange, onNext }: IdentityStepContentProps) {
  const t = useTranslations("agents");
  const templates = useMemo(() => getTemplates(t), [t]);
  const [websiteUrl, setWebsiteUrl] = useState(agent.websiteUrl ?? "");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [pendingExtract, setPendingExtract] = useState<ExtractedBusinessDetails | null>(null);

  const toneOptions = useMemo(
    () => (["professional", "friendly", "casual", "formal"] as ToneId[]).map((id) => ({
      id,
      label: t(`identity.tone.${id}`),
    })),
    [t],
  );
  const industryOptions = useMemo(() => {
    const ids = ["", "dental", "legal", "plumbing", "real_estate", "auto", "salon", "restaurant", "medical", "consulting", "contractor"] as const;
    return ids.map((id) => ({
      id,
      label: id === "" ? t("identity.industry.general") : t(`identity.industry.${id}`),
      greeting: id ? t(`identity.industryGreeting.${id}`) : undefined,
    }));
  }, [t]);

  useEffect(() => {
    setWebsiteUrl(agent.websiteUrl ?? "");
  }, [agent.websiteUrl]);

  const purpose = agent.purpose ?? "both";
  const nameValid = (agent.name ?? "").trim().length > 0;
  const greetingValid = (agent.greeting ?? "").trim().length > 0;
  const canContinue = nameValid && greetingValid;
  const [triedContinue, setTriedContinue] = useState(false);
  const showNameError = triedContinue && !nameValid;
  const showGreetingError = triedContinue && !greetingValid;

  const agentTone = useMemo<ToneId>(() => {
    if (agent.personality < 0 || agent.personality > 100) return "professional";
    if (agent.personality <= 25) return "formal";
    if (agent.personality <= 50) return "professional";
    if (agent.personality <= 75) return "friendly";
    return "casual";
  }, [agent.personality]);

  const handleWebsiteExtract = async () => {
    const url = websiteUrl.trim();
    if (!url || extracting) return;
    setExtractError(null);
    setPendingExtract(null);
    setExtracting(true);
    try {
      const res = await fetch("/api/agent/extract-business", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | (ExtractedBusinessDetails & { error?: string })
        | { error: string };
      if (!res.ok || "error" in data) {
        setExtractError(data.error ?? t("identityStep.websiteError"));
        return;
      }
      if (!data.businessName && !data.industry && !data.services?.length) {
        setExtractError(t("identityStep.websiteNoDetails"));
        return;
      }
      setPendingExtract({
        businessName: String(data.businessName ?? "").trim(),
        industry: data.industry,
        services: data.services,
        location: data.location,
        targetAudience: data.targetAudience,
        faq: data.faq,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("identityStep.websiteReadError");
      setExtractError(message);
    } finally {
      setExtracting(false);
    }
  };

  const applyExtractedDetails = (data: ExtractedBusinessDetails) => {
    const services = Array.isArray(data.services)
      ? data.services.map((s) => String(s ?? "").trim()).filter(Boolean)
      : [];
    const faqSource = Array.isArray(data.faq) ? data.faq : [];
    const existingFaq = Array.isArray(agent.faq) ? agent.faq : [];
    const newFaq = faqSource
      .map((entry, index) => {
        const question = String(entry?.question ?? "").trim();
        const answer = String(entry?.answer ?? "").trim();
        if (!question || !answer) return null;
        return {
          id: generateId(`faq-${index}`),
          question,
          answer,
        };
      })
      .filter((e): e is { id: string; question: string; answer: string } => !!e);

    const contextParts: string[] = [];
    if (data.industry?.trim()) contextParts.push(data.industry.trim());
    if (services.length) contextParts.push(services.join(", "));
    if (data.location?.trim()) contextParts.push(data.location.trim());
    const businessContext =
      contextParts.join(" · ") ||
      agent.businessContext ||
      t("identityStep.describeHint");

    onChange({
      name: (agent.name ?? "").trim() ? agent.name : data.businessName || agent.name,
      businessContext,
      targetAudience:
        (agent.targetAudience ?? "").trim() ||
        (data.targetAudience ?? "").trim() ||
        agent.targetAudience,
      websiteUrl: websiteUrl.trim(),
      services: services.length ? services : agent.services,
      faq: newFaq.length ? [...existingFaq, ...newFaq] : existingFaq,
    });
  };

  const applyTemplate = (tpl: ReturnType<typeof getTemplates>[number]) => {
    if ("purpose" in tpl.defaults && tpl.defaults.purpose != null) {
      onChange({
        template: tpl.id,
        purpose: tpl.defaults.purpose,
        primaryGoal:
          (tpl.defaults as { primaryGoal?: PrimaryGoalId }).primaryGoal ?? "answer_route",
        greeting:
          (agent.greeting ?? "").trim()
            ? agent.greeting
            : ((tpl.defaults as { greeting?: string }).greeting ?? ""),
      });
    } else {
      onChange({ template: tpl.id });
    }
  };

  const handleContinue = () => {
    setTriedContinue(true);
    if (!canContinue) return;
    onNext();
  };

  return (
    <div className="space-y-6">
      <h3
        id="identity-heading"
        className="text-sm font-semibold text-white"
      >
        {t("identityStep.purposeLabel")}
      </h3>

      <section
        aria-label="Industry and tone"
        className="space-y-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"
      >
        <div>
          <label
            htmlFor="identity-industry"
            className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
          >
            {t("identityStep.industryLabel")}
          </label>
          <select
            id="identity-industry"
            className="h-9 w-full rounded-xl border border-[var(--border-subtle)] bg-black/40 px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)]"
            value=""
            onChange={(e) => {
              const value = e.target.value;
              if (!value) return;
              const industry = industryOptions.find((opt) => opt.id === value);
              if (!industry) return;
              if (industry.greeting) {
                onChange({
                  greeting:
                    (agent.greeting ?? "").trim() ? agent.greeting : industry.greeting,
                });
              }
            }}
          >
            <option value="">{t("identityStep.selectIndustry")}</option>
            {industryOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            {t("identityStep.toneLabel")}
          </span>
          <div className="flex flex-wrap gap-2">
            {toneOptions.map((tone) => {
              const selected = agentTone === tone.id;
              return (
                <button
                  key={tone.id}
                  type="button"
                  className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs transition ${
                    selected
                      ? "border-white bg-white text-black"
                      : "border-[var(--border-subtle)] bg-black/40 text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
                  }`}
                  onClick={() => {
                    const personality =
                      tone.id === "formal"
                        ? 15
                        : tone.id === "professional"
                          ? 40
                          : tone.id === "friendly"
                            ? 70
                            : 90;
                    onChange({ personality });
                  }}
                >
                  {tone.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section
        aria-label="Core identity"
        className="space-y-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="agent-name"
              className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
            >
              {t("identityStep.agentNameLabel")}
            </label>
            <input
              id="agent-name"
              type="text"
              className={`h-9 w-full rounded-xl border bg-black/40 px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)] ${
                showNameError ? "border-red-500/70" : "border-[var(--border-subtle)]"
              }`}
              value={agent.name ?? ""}
              onChange={(e) => onChange({ name: e.target.value })}
            />
            {showNameError && (
              <p className="mt-1 text-[10px] text-red-400">
                {t("identityStep.nameError")}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="agent-purpose"
              className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
            >
              {t("identityStep.callDirectionLabel")}
            </label>
            <div className="flex gap-2">
              {(["inbound", "outbound", "both"] as AgentPurpose[]).map((value) => {
                const selected = purpose === value;
                return (
                  <button
                    key={value}
                    type="button"
                    className={`flex-1 rounded-xl border px-3 py-2 text-[11px] font-medium whitespace-nowrap transition ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-[var(--border-subtle)] bg-black/40 text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
                    }`}
                    onClick={() => onChange({ purpose: value })}
                  >
                    {value === "inbound"
                      ? t("purpose.inbound")
                      : value === "outbound"
                        ? t("purpose.outbound")
                        : t("purpose.both")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="agent-greeting"
            className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
          >
            {t("identityStep.openingLineLabel")}
          </label>
          <textarea
            id="agent-greeting"
            className={`min-h-[72px] w-full resize-none rounded-xl border bg-black/40 px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)] ${
              showGreetingError ? "border-red-500/70" : "border-[var(--border-subtle)]"
            }`}
            value={agent.greeting ?? ""}
            onChange={(e) => onChange({ greeting: e.target.value })}
            placeholder={t("identityStep.greetingPlaceholder")}
          />
          {showGreetingError && (
            <p className="mt-1 text-[10px] text-red-400">
              {t("identityStep.greetingError")}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="agent-target"
            className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
          >
            {t("identityStep.targetAudienceLabel")}
          </label>
          <textarea
            id="agent-target"
            className="min-h-[56px] w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-black/40 px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)]"
            value={agent.targetAudience ?? ""}
            onChange={(e) => onChange({ targetAudience: e.target.value })}
            placeholder={t("identityStep.targetAudiencePlaceholder")}
          />
        </div>

        <div>
          <label
            htmlFor="agent-website"
            className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
          >
            {t("identityStep.websiteLabel")}
          </label>
          <div className="flex gap-2">
            <input
              id="agent-website"
              type="url"
              className="h-9 flex-1 rounded-xl border border-[var(--border-subtle)] bg-black/40 px-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)]"
              placeholder={t("identityStep.websitePlaceholder")}
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
            <button
              type="button"
              onClick={handleWebsiteExtract}
              disabled={extracting || !websiteUrl.trim()}
              className="h-9 rounded-xl bg-white px-4 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:bg-white/40"
            >
              {extracting ? t("identityStep.reading") : t("identityStep.fillFromSite")}
            </button>
          </div>
          {extractError && (
            <p className="mt-1 text-[10px] text-red-400">{extractError}</p>
          )}
          {pendingExtract && (
            <div className="mt-2 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-2.5 text-[11px] text-[var(--text-secondary)]">
              <p className="mb-1 font-medium text-emerald-300">
                {t("identityStep.websiteDetailsReady")}
              </p>
              <p className="mb-2 text-xs text-emerald-100/80">
                {t("identityStep.websiteDetailsBody")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-black"
                  onClick={() => {
                    applyExtractedDetails(pendingExtract);
                    setPendingExtract(null);
                  }}
                >
                  {t("identityStep.applyDetails")}
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
                  onClick={() => setPendingExtract(null)}
                >
                  {t("identityStep.dismiss")}
                </button>
              </div>
            </div>
          )}
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            {t("identityStep.websitePrivacy")}
          </p>
        </div>
      </section>

      <section
        aria-label="Playbooks"
        className="space-y-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"
      >
        <div>
          <h4 className="text-xs font-semibold text-[var(--text-primary)]">
            {t("identityStep.playbooksLabel")}
          </h4>
          <p className="text-[10px] text-[var(--text-muted)]">
            {t("identityStep.playbooksHint")}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {templates.map((tpl) => {
            const Icon = PLAYBOOK_ICONS[tpl.id] ?? Settings;
            const selected = agent.template === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className={`group flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition ${
                  selected
                    ? "border-white bg-white text-black"
                    : "border-[var(--border-subtle)] bg-black/40 text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-[var(--text-primary)] ${
                      selected ? "border-black/20 bg-black/10" : "border-[var(--border-subtle)]"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="text-xs font-semibold">{t(`identity.templates.${tpl.id}.label`)}</span>
                </div>
                <p className="text-[10px] leading-snug opacity-80">{t(`identity.templates.${tpl.id}.desc`)}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between pt-1">
        <div className="text-[11px] text-[var(--text-muted)]">
          {t("identityStep.stepIndicator")}
        </div>
        <button
          type="button"
          onClick={handleContinue}
          className="rounded-xl bg-white px-5 py-2 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:bg-white/40"
          disabled={!canContinue}
        >
          {t("identityStep.continueToVoice")}
        </button>
      </div>
    </div>
  );
}

