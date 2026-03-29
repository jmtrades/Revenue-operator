"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PhoneIncoming,
  PhoneOutgoing,
  Phone,
  Mic,
  BookOpen,
  Shield,
  Calendar,
  Play,
  Rocket,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { AGENT_TEMPLATES, type AgentTemplate } from "@/lib/data/agent-templates";
import { CURATED_VOICES, DEFAULT_VOICE_ID } from "@/lib/constants/curated-voices";

const STEPS = [
  { id: 1, labelKey: "stepMission", icon: Phone },
  { id: 2, labelKey: "stepVoiceIdentity", icon: Mic },
  { id: 3, labelKey: "stepIntelligence", icon: BookOpen },
  { id: 4, labelKey: "stepGuardrails", icon: Shield },
  { id: 5, labelKey: "stepOperatingHours", icon: Calendar },
  { id: 6, labelKey: "stepVerify", icon: Play },
  { id: 7, labelKey: "stepDeploy", icon: Rocket },
] as const;

type PurposeChoice = "inbound" | "outbound" | "both";
type ConversationStyle = "professional" | "friendly" | "casual" | "authoritative";

interface WizardState {
  purpose: PurposeChoice;
  templateId: string | null;
  name: string;
  voiceId: string;
  speakingSpeed: number;
  conversationStyle: ConversationStyle;
  language: string;
  greeting: string;
  businessHours: string;
  faq: Array<{ question: string; answer: string }>;
  neverSay: string[];
  objectionHandling: string;
  bantEnabled: boolean;
  phoneNumberId: string | null;
  activeHours: string;
  timezone: string;
  voicemailBehavior: "messages" | "forward" | "closed";
}

function getDefaultState(tAgents: (key: string) => string): WizardState {
  return {
    purpose: "both",
    templateId: null,
    name: tAgents("defaultAgent.name"),
    voiceId: DEFAULT_VOICE_ID,
    speakingSpeed: 1,
    conversationStyle: "professional",
    language: "en",
    greeting: tAgents("defaultAgent.simpleGreeting"),
    businessHours: tAgents("defaultAgent.defaultHours"),
    faq: [],
    neverSay: [],
    objectionHandling: "",
    bantEnabled: false,
    phoneNumberId: null,
    activeHours: "9:00-17:00",
    timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/New_York"; } })(),
    voicemailBehavior: "messages",
  };
}

function getTemplatesForPurpose(purpose: PurposeChoice): AgentTemplate[] {
  if (purpose === "inbound")
    return AGENT_TEMPLATES.filter((t) => t.category === "inbound" || t.category === "multi-channel");
  if (purpose === "outbound")
    return AGENT_TEMPLATES.filter((t) => t.category === "outbound" || t.category === "multi-channel");
  return AGENT_TEMPLATES;
}

export default function NewAgentWizardClient({
  workspaceId,
  workspaceName: _workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const router = useRouter();
  const t = useTranslations("agents.newWizard");
  const tAgents = useTranslations("agents");
  const tCommon = useTranslations("common");
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(() => getDefaultState(tAgents));
  const [agentId, setAgentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const applyTemplate = useCallback((t: AgentTemplate) => {
    setState((prev) => ({
      ...prev,
      templateId: t.id,
      name: t.name.replace(/^The\s+/, "") ?? t.name,
      greeting: t.defaultGreeting,
      voiceId: t.voiceId ?? prev.voiceId,
    }));
  }, []);

  const validateStep = useCallback(
    (s: number): string | null => {
      if (s === 1) return state.name.trim() ? null : t("errors.nameRequired");
      if (s === 2) return null;
      if (s === 3) return null;
      if (s === 4) return null;
      if (s === 5) return null;
      if (s === 6) return null;
      return null;
    },
    [state.name, t]
  );

  const saveDraft = useCallback(async () => {
    setSaving(true);
    setToast(null);
    try {
      let id = agentId;
      if (!id) {
        const res = await fetch("/api/agents", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: workspaceId,
            name: state.name.trim() || tAgents("defaultAgent.name"),
            ...(state.templateId ? { template: state.templateId } : {}),
            purpose: state.purpose,
            personality: state.conversationStyle === "authoritative" ? "professional" : state.conversationStyle,
            voice_id: state.voiceId,
            greeting: state.greeting,
          }),
        });
        if (!res.ok) throw new Error("Create failed");
        const created = (await res.json()) as { id: string };
        id = created.id;
        setAgentId(created.id);
      }

      const personalityMap: Record<ConversationStyle, string> = {
        professional: "professional",
        friendly: "friendly",
        casual: "casual",
        authoritative: "professional",
      };
      const res = await fetch(`/api/agents/${id!}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name.trim() || tAgents("defaultAgent.name"),
          voice_id: state.voiceId,
          personality: personalityMap[state.conversationStyle],
          purpose: state.purpose,
          greeting: state.greeting,
          ...(state.templateId ? { template: state.templateId } : {}),
          knowledge_base: {
            faq: state.faq.map((f) => ({ q: f.question, a: f.answer })),
            businessContext: state.businessHours,
          },
          rules: {
            neverSay: state.neverSay,
          },
          is_active: false,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setToast(t("toast.draftSaved"));
    } catch {
      setToast(t("toast.saveError"));
    } finally {
      setSaving(false);
    }
  }, [agentId, workspaceId, state, t, tAgents]);

  const handleNext = useCallback(async () => {
    const err = validateStep(step);
    if (err) {
      setToast(err);
      return;
    }
    setToast(null);
    if (step === 1 && !agentId) {
      setSaving(true);
      try {
        const res = await fetch("/api/agents", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: workspaceId,
            name: state.name.trim() || tAgents("defaultAgent.name"),
            ...(state.templateId ? { template: state.templateId } : {}),
            purpose: state.purpose,
            personality: state.conversationStyle === "authoritative" ? "professional" : state.conversationStyle,
            voice_id: state.voiceId,
            greeting: state.greeting,
          }),
        });
        if (!res.ok) throw new Error("Create failed");
        const created = (await res.json()) as { id: string };
        setAgentId(created.id);
      } catch {
        setToast(t("toast.createError"));
        setSaving(false);
        return;
      }
      setSaving(false);
    } else if (step < 7) {
      await saveDraft();
    }
    if (step === 7) {
      if (!agentId) return;
      setSaving(true);
      try {
        await fetch(`/api/agents/${agentId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: true }),
        });
        router.push("/app/agents");
        return;
      } catch {
        setToast(t("toast.activateError"));
      }
      setSaving(false);
      return;
    }
    setStep((s) => Math.min(7, s + 1));
  }, [step, agentId, state.name, state.templateId, state.purpose, state.conversationStyle, state.voiceId, state.greeting, workspaceId, validateStep, saveDraft, router, t, tAgents]);

  const handleBack = useCallback(() => {
    setToast(null);
    setStep((s) => Math.max(1, s - 1));
  }, []);

  const templates = getTemplatesForPurpose(state.purpose);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 pb-24">
      <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-sm mb-6">
        <Link href="/app/agents" className="hover:text-[var(--text-primary)]">
          {tCommon("agents")}
        </Link>
        <span>/</span>
        <span className="text-[var(--text-primary)]">{t("breadcrumbs.newAgent")}</span>
      </div>

      <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)] mb-1">{t("title")}</h1>
      <p className="text-[var(--text-tertiary)] text-sm mb-8">{t("subtitle")}</p>

      {/* Progress */}
      <div className="flex gap-1 mb-8" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={7}>
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`h-1 flex-1 rounded-full ${s.id <= step ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-inset)]"}`}
            title={`Step ${s.id}: ${t(s.labelKey)}`}
          />
        ))}
      </div>

      {toast && (
        <div className="mb-4 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] text-sm">
          {toast}
        </div>
      )}

      {/* Step content */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 mb-6">
        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t("missionTitle")}</h2>
            <p className="text-[var(--text-tertiary)] text-sm mb-4">{t("missionHint")}</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {(
                [
                  { value: "inbound" as const, label: t("purposeAnswerCalls"), icon: PhoneIncoming },
                  { value: "outbound" as const, label: t("purposeMakeCalls"), icon: PhoneOutgoing },
                  { value: "both" as const, label: t("purposeBoth"), icon: Phone },
                ] as const
              ).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setState((p) => ({ ...p, purpose: value }))}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    state.purpose === value
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                      : "border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  <Icon className="w-5 h-5 mb-2" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
            <p className="text-[var(--text-secondary)] text-sm mb-2">{t("templateLabel")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {templates.slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className={`p-3 rounded-xl border text-left text-sm ${
                    state.templateId === t.id ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]" : "border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--border-default)]"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <label className="block mt-4 text-sm text-[var(--text-tertiary)] mb-1">{t("agentNameLabel")}</label>
            <input
              type="text"
              value={state.name}
              onChange={(e) => setState((p) => ({ ...p, name: e.target.value }))}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-default)] focus:ring-1 focus:ring-[var(--border-default)]"
              placeholder={t("namePlaceholder")}
            />
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t("voiceIdentityTitle")}</h2>
            <p className="text-[var(--text-tertiary)] text-sm mb-4">{t("voiceIdentityHint")}</p>
            <label className="block text-sm text-[var(--text-tertiary)] mb-1">{t("voiceLabel")}</label>
            <select
              value={state.voiceId}
              onChange={(e) => setState((p) => ({ ...p, voiceId: e.target.value }))}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] mb-4"
            >
              {CURATED_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {v.desc}
                </option>
              ))}
            </select>
            <label className="block text-sm text-[var(--text-tertiary)] mb-1">{t("speakingSpeedLabel")}</label>
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.05"
              value={state.speakingSpeed}
              onChange={(e) => setState((p) => ({ ...p, speakingSpeed: parseFloat(e.target.value) }))}
              className="w-full mb-2"
            />
            <span className="text-[var(--text-secondary)] text-sm">{state.speakingSpeed.toFixed(2)}x</span>
            <label className="block text-sm text-[var(--text-tertiary)] mt-4 mb-1">{t("conversationStyleLabel")}</label>
            <select
              value={state.conversationStyle}
              onChange={(e) => setState((p) => ({ ...p, conversationStyle: e.target.value as ConversationStyle }))}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)]"
            >
              <option value="professional">{t("conversationStyleProfessional")}</option>
              <option value="friendly">{t("conversationStyleFriendly")}</option>
              <option value="casual">{t("conversationStyleCasual")}</option>
              <option value="authoritative">{t("conversationStyleAuthoritative")}</option>
            </select>
            <label className="block text-sm text-[var(--text-tertiary)] mt-4 mb-1">{t("greetingLabel")}</label>
            <textarea
              value={state.greeting}
              onChange={(e) => setState((p) => ({ ...p, greeting: e.target.value }))}
              rows={2}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] placeholder-zinc-500 focus:border-[var(--border-default)]"
              placeholder={t("greetingPlaceholder")}
            />
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t("intelligenceHeading")}</h2>
            <p className="text-[var(--text-tertiary)] text-sm mb-4">{t("intelligenceSubtitle")}</p>
            <label className="block text-sm text-[var(--text-tertiary)] mb-1">{t("businessHoursLabel")}</label>
            <input
              type="text"
              value={state.businessHours}
              onChange={(e) => setState((p) => ({ ...p, businessHours: e.target.value }))}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] mb-4"
              placeholder={t("businessHoursPlaceholder")}
            />
            <label className="block text-sm text-[var(--text-tertiary)] mb-1">{t("faqsLabel")}</label>
            {state.faq.map((f, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={f.question}
                  onChange={(e) =>
                    setState((p) => ({
                      ...p,
                      faq: p.faq.map((q, j) => (j === i ? { ...q, question: e.target.value } : q)),
                    }))
                  }
                  placeholder={t("questionPlaceholder")}
                  className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm"
                />
                <input
                  type="text"
                  value={f.answer}
                  onChange={(e) =>
                    setState((p) => ({
                      ...p,
                      faq: p.faq.map((q, j) => (j === i ? { ...q, answer: e.target.value } : q)),
                    }))
                  }
                  placeholder={t("answerPlaceholder")}
                  className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setState((p) => ({ ...p, faq: [...p.faq, { question: "", answer: "" }] }))}
              className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] rounded-xl px-3 py-2"
            >
              {t("addFaq")}
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t("guardrailsHeading")}</h2>
            <p className="text-[var(--text-tertiary)] text-sm mb-4">{t("guardrailsSubtitle")}</p>
            <label className="block text-sm text-[var(--text-tertiary)] mb-1">{t("neverSayLabel")}</label>
            <textarea
              value={state.neverSay.join("\n")}
              onChange={(e) => setState((p) => ({ ...p, neverSay: e.target.value.split("\n").filter(Boolean) }))}
              rows={3}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] mb-4"
              placeholder={t("neverSayPlaceholder")}
            />
            <label className="block text-sm text-[var(--text-tertiary)] mb-1">{t("objectionLabel")}</label>
            <textarea
              value={state.objectionHandling}
              onChange={(e) => setState((p) => ({ ...p, objectionHandling: e.target.value }))}
              rows={2}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)]"
              placeholder={t("objectionPlaceholder")}
            />
            <label className="flex items-center gap-2 mt-4 text-sm text-[var(--text-tertiary)]">
              <input
                type="checkbox"
                checked={state.bantEnabled}
                onChange={(e) => setState((p) => ({ ...p, bantEnabled: e.target.checked }))}
                className="rounded border-[var(--border-default)]"
              />
              {t("bantLabel")}
            </label>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t("operatingHoursHeading")}</h2>
            <p className="text-[var(--text-tertiary)] text-sm mb-4">{t("operatingHoursSubtitle")}</p>
            <label className="block text-sm text-[var(--text-tertiary)] mb-1">{t("activeHoursLabel")}</label>
            <input
              type="text"
              value={state.activeHours}
              onChange={(e) => setState((p) => ({ ...p, activeHours: e.target.value }))}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] mb-4"
              placeholder={t("activeHoursPlaceholder")}
            />
            <label className="block text-sm text-[var(--text-tertiary)] mb-1">{t("timezoneLabel")}</label>
            <input
              type="text"
              value={state.timezone}
              onChange={(e) => setState((p) => ({ ...p, timezone: e.target.value }))}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] mb-4"
              placeholder={t("timezonePlaceholder")}
            />
            <label className="block text-sm text-[var(--text-tertiary)] mb-1">{t("whenOutsideHoursLabel")}</label>
            <select
              value={state.voicemailBehavior}
              onChange={(e) => setState((p) => ({ ...p, voicemailBehavior: e.target.value as WizardState["voicemailBehavior"] }))}
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-[var(--text-primary)]"
            >
              <option value="messages">{t("voicemailTakeMessage")}</option>
              <option value="forward">{t("voicemailForward")}</option>
              <option value="closed">{t("voicemailClosed")}</option>
            </select>
            <p className="text-[var(--text-secondary)] text-sm mt-4">
              {t("assignNumberHint")} <Link href="/app/settings/phone" className="text-[var(--text-primary)] underline">Settings → Phone</Link> {t("assignNumberHintAfter")}
            </p>
          </>
        )}

        {step === 6 && (
          <>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t("verifyHeading")}</h2>
            <p className="text-[var(--text-tertiary)] text-sm mb-4">{t("verifySubtitle")}</p>
            {agentId ? (
              <Link
                href={`/app/agents/${agentId}/voice-test`}
                className="inline-flex items-center gap-2 bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold rounded-xl px-4 py-2.5 hover:opacity-90"
              >
                <Play className="w-4 h-4" />
                {t("openTestCall")}
              </Link>
            ) : (
              <p className="text-[var(--text-secondary)] text-sm">{t("saveDraftFirst")}</p>
            )}
            <p className="text-[var(--text-secondary)] text-sm mt-4">{t("testFromAgentPage")}</p>
          </>
        )}

        {step === 7 && (
          <>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t("deployHeading")}</h2>
            <p className="text-[var(--text-tertiary)] text-sm mb-4">{t("deploySubtitle")}</p>
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 space-y-2 text-sm">
              <p><span className="text-[var(--text-secondary)]">{t("reviewName")}</span> <span className="text-[var(--text-primary)]">{state.name}</span></p>
              <p><span className="text-[var(--text-secondary)]">{t("reviewPurpose")}</span> <span className="text-[var(--text-primary)]">{state.purpose}</span></p>
              <p><span className="text-[var(--text-secondary)]">{t("reviewVoice")}</span> <span className="text-[var(--text-primary)]">{CURATED_VOICES.find((v) => v.id === state.voiceId)?.name ?? state.voiceId}</span></p>
              <p><span className="text-[var(--text-secondary)]">{t("reviewGreeting")}</span> <span className="text-[var(--text-secondary)]">{state.greeting.slice(0, 60)}{state.greeting.length > 60 ? "…" : ""}</span></p>
            </div>
            <p className="text-[var(--text-secondary)] text-sm mt-4">{t("costNote")}</p>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="flex items-center gap-1 border border-[var(--border-default)] text-[var(--text-secondary)] rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40 disabled:pointer-events-none hover:bg-[var(--bg-inset)]"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("back")}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving}
            className="border border-[var(--border-default)] text-[var(--text-secondary)] rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-[var(--bg-inset)] disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("saveDraft")}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={saving}
            className="flex items-center gap-1 bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold rounded-xl px-6 py-2.5 text-sm hover:opacity-90 disabled:opacity-50"
          >
            {step === 7 ? t("deploy") : t("next")}
            {step < 7 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
