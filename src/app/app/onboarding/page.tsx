"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Headphones,
  MoonStar,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { useOnboardingStep } from "../OnboardingStepContext";
import IndustrySelector from "@/components/onboarding/IndustrySelector";
import { speakTextViaApi } from "@/lib/voice-preview";
import { Waveform } from "@/components/Waveform";
import { WorkspaceVoiceButton } from "@/components/WorkspaceVoiceButton";
import { CURATED_VOICES, DEFAULT_VOICE_ID } from "@/lib/constants/curated-voices";
import { USE_CASE_OPTIONS } from "@/lib/constants/use-cases";
import { buildStarterKnowledge, mergeKnowledgeItems, type KnowledgeItem } from "@/lib/workspace/starter-knowledge";
import { invalidateWorkspaceMeCache } from "@/lib/client/workspace-me";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/client/safe-storage";

const STEPS = 5;
const STEP_KEYS: { id: number; titleKey: string; subtitleKey: string }[] = [
  { id: 1, titleKey: "step.mode", subtitleKey: "mode.description" },
  { id: 2, titleKey: "step.business", subtitleKey: "business.description" },
  { id: 3, titleKey: "step.agent", subtitleKey: "agent.description" },
  { id: 4, titleKey: "step.knowledge", subtitleKey: "knowledge.description" },
  { id: 5, titleKey: "step.phone", subtitleKey: "phone.description" },
];

const ONBOARDING_SCENARIO_IDS = ["normal", "angry", "booking", "afterhours", "unknown"] as const;

const ONBOARDING_TEMPLATE_IDS = [
  { id: "receptionist", icon: Headphones },
  { id: "appointment_scheduler", icon: CalendarRange },
  { id: "lead_qualifier", icon: ClipboardList },
  { id: "after_hours", icon: MoonStar },
  { id: "follow_up", icon: PhoneCall },
  { id: "custom", icon: Sparkles },
] as const;

export default function AppOnboardingPage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const onboardingTemplates = useMemo(
    () =>
      ONBOARDING_TEMPLATE_IDS.map(({ id, icon }) => ({
        id,
        icon,
        name: t(`templates.${id}.name`),
        description: t(`templates.${id}.description`),
        agentName: t(`templates.${id}.agentName`),
        greeting: t(`templates.${id}.greeting`),
      })),
    [t],
  );
  const onboardingScenarios = (ONBOARDING_SCENARIO_IDS as readonly string[]).map((id) => ({
    id,
    title: t(`scenarios.${id}.title`),
    description: t(`scenarios.${id}.description`),
    phrase: t(`scenarios.${id}.phrase`),
  }));
  const useCaseOptions = USE_CASE_OPTIONS.map(({ id }) => ({ id, label: t(`useCases.${id}`) }));
  const onboardingCtx = useOnboardingStep();
  const step = onboardingCtx?.step ?? 1;
  const setStep = onboardingCtx?.setStep ?? (() => {});

  useEffect(() => {
    document.title = t("pageTitle");
    return () => { document.title = ""; };
  }, [t]);

  const [mode, setMode] = useState<"solo" | "sales" | "business" | null>(null);
  const [industrySlug, setIndustrySlug] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [useCases, setUseCases] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [_timezone, setTimezone] = useState("America/Los_Angeles");
  const [businessPhone, setBusinessPhone] = useState("");

  useEffect(() => {
    const apply = () => {
      try {
        const raw = safeGetItem("rt_signup") ?? safeGetItem("recalltouch_signup");
        if (raw) {
          try {
            const d = JSON.parse(raw) as { businessName?: string; businessType?: string; industry?: string; website?: string };
            if (d?.businessName?.trim()) setBusinessName(d.businessName.trim());
            if (d?.website?.trim()) setWebsite(d.website.trim());
          } catch {
            safeRemoveItem("rt_signup");
            safeRemoveItem("recalltouch_signup");
          }
        }
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
        setTimezone(tz);
      } catch {
        // ignore
      }
    };
    const id = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(id);
  }, []);

  const [_selectedTemplate, _setSelectedTemplate] = useState<string>("receptionist");
  const [agentName, setAgentName] = useState<string>(onboardingTemplates[0].agentName);
  const [voiceId, setVoiceId] = useState<string>(DEFAULT_VOICE_ID);
  const [greeting, setGreeting] = useState<string>(onboardingTemplates[0].greeting);
  const [_personality, _setPersonality] = useState(50);
  const [_callStyle, _setCallStyle] = useState<"thorough" | "conversational" | "quick">("conversational");
  const [greetingPlaying, setGreetingPlaying] = useState(false);

  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState("");
  const [_hours, _setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({});
  const [_afterHours, _setAfterHours] = useState<"messages" | "emergency" | "forward">("messages");
  const [_faqRows, _setFaqRows] = useState<string[]>(["", "", ""]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [editingKnowledgeIdx, setEditingKnowledgeIdx] = useState<number | null>(null);
  const [editingQ, setEditingQ] = useState("");
  const [editingA, setEditingA] = useState("");
  const [starterAdded, setStarterAdded] = useState(false);
  const [businessHoursDisplay, setBusinessHoursDisplay] = useState("");

  // No fake number: user gets a number in Settings → Phone or forwards existing
  const [_phoneDisplay] = useState<string | null>(null);
  const [_numberOption, _setNumberOption] = useState<"forward" | "new" | "skip">("new");
  const [showConfetti, setShowConfetti] = useState(false);

  const defaultGreeting = t("defaultGreeting", { businessName: businessName || t("businessPlaceholder"), agentName });

  const step2VoiceButtons = useMemo(() => {
    const voices = CURATED_VOICES.slice(0, 6).map((v) => ({
      id: v.id,
      name: v.name,
      desc: v.desc,
      gender: v.gender,
      preview: t("defaultPreview"),
    }));
    return voices.map((v) => {
      const selected = voiceId === v.id;
      return (
        <button
          key={v.id}
          type="button"
          onClick={() => { setVoiceId(v.id); setAgentName(v.name); }}
          className={`rounded-xl border p-4 text-left transition-all ${
            selected ? "border-[var(--border-medium)] bg-[var(--bg-hover)] ring-2 ring-zinc-500/40" : "border-[var(--border-default)] bg-transparent hover:border-[var(--border-medium)]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">{v.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void speakTextViaApi(v.preview, { gender: v.gender, voiceId: v.id }); }}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] text-xs"
              aria-label={t("previewVoiceAria", { name: v.name })}
            >
              ▶
            </button>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{v.desc}</p>
          {selected && <p className="text-[10px] text-[var(--text-primary)] mt-1">{t("selected")}</p>}
        </button>
      );
    });
  }, [t, voiceId]);

  const addService = () => {
    const t = serviceInput.trim();
    if (t && !services.includes(t)) {
      setServices((s) => [...s, t]);
      setServiceInput("");
    }
  };

  const finishOnboarding = async () => {
    const defaultHours = {
      monday: { start: "09:00", end: "17:00" },
      tuesday: { start: "09:00", end: "17:00" },
      wednesday: { start: "09:00", end: "17:00" },
      thursday: { start: "09:00", end: "17:00" },
      friday: { start: "09:00", end: "17:00" },
    };
    const starter = buildStarterKnowledge({ useCases, address, businessHours: defaultHours, services });
    const merged = mergeKnowledgeItems(knowledgeItems, starter);

    try {
      await fetch("/api/workspace/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          businessPhone: businessPhone || null,
          website,
          address,
          useCases: useCases.length ? useCases : undefined,
          agentName,
          greeting: greetingToPlay,
          knowledgeItems: merged,
          preferredLanguage: "en",
          voiceId: voiceId,
          businessHours: defaultHours,
          mode: mode ?? undefined,
          industry: industrySlug ?? undefined,
        }),
      });
      await fetch("/api/workspace/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingCompletedAt: new Date().toISOString(),
        }),
      });
      invalidateWorkspaceMeCache();
    } catch {
      // ignore and continue to local fallbacks
    }
    safeSetItem("rt_onboarded", "true");
    safeSetItem("rt_onboarding_checklist", JSON.stringify(["business", "agent", "services", "phone", "test_call"]));
    router.push("/app/activity");
  };

  const handleGoToDashboard = () => {
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      void finishOnboarding();
    }, 1600);
  };

  const skipOnboarding = async () => {
    try {
      await fetch("/api/workspace/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingCompletedAt: new Date().toISOString(),
        }),
      });
    } catch {
      // ignore
    }
    safeSetItem("rt_onboarded", "true");
    router.push("/app/activity");
  };

  const greetingToPlay = greeting.trim() || defaultGreeting;

  return (
    <div className="min-h-screen bg-black text-[var(--text-primary)] flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-zinc-900 bg-zinc-950 px-6 py-8 gap-8">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[var(--text-tertiary)]">
            Recall Touch
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t("sidebarLabel")}</p>
        </div>
        <nav aria-label={t("stepsAria")} className="space-y-4">
          {STEP_KEYS.map((s) => {
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-start gap-3">
                <span
                  className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${
                    active ? "bg-white" : "bg-zinc-700"
                  }`}
                  aria-hidden
                />
                <div>
                  <p
                    className={`text-xs font-medium ${
                      active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
                    }`}
                  >
                    {s.id}. {t(s.titleKey)}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">{t(s.subtitleKey)}</p>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col px-4 py-6 md:px-10 md:py-10">
        <div className="max-w-2xl mx-auto w-full">
          <div className="mb-6 flex items-center justify-between md:hidden">
            <div
              className="flex items-center justify-center gap-2"
              aria-label={`Step ${step} of ${STEPS}`}
            >
              {Array.from({ length: STEPS }, (_, i) => (
                <span
                  key={i}
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    i + 1 <= step ? "bg-white" : "bg-zinc-700"
                  }`}
                  aria-hidden
                />
              ))}
            </div>
            <button
              type="button"
              onClick={skipOnboarding}
              className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] rounded-xl px-3 py-1 transition-colors"
            >
              {t("cta.skip")}
            </button>
          </div>
          <div className="mb-6 hidden md:block">
            <div
              className="flex items-center justify-between gap-4"
              aria-label={`Step ${step} of ${STEPS}`}
            >
              <div className="flex items-center gap-2">
                {Array.from({ length: STEPS }, (_, i) => (
                  <span
                    key={i}
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      i + 1 <= step ? "bg-white" : "bg-zinc-700"
                    }`}
                    aria-hidden
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={skipOnboarding}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] rounded-xl px-3 py-1 transition-colors"
              >
                {t("cta.skip")} →
              </button>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 md:p-8">
        {/* Step 1 — MODE + INDUSTRY */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="space-y-3">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {t("welcomeHeading")}
              </h1>
              <p className="text-sm text-[var(--text-tertiary)]">
                {t("welcomeSubtitle")}
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-xs font-medium text-[var(--text-tertiary)]">
                {t("modeLabel")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "solo" as const, title: t("modeSoloTitle"), desc: t("modeSoloDesc") },
                  { id: "sales" as const, title: t("modeSalesTitle"), desc: t("modeSalesDesc") },
                  { id: "business" as const, title: t("modeBusinessTitle"), desc: t("modeBusinessDesc") },
                ].map((m) => {
                  const active = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        active
                          ? "border-white bg-[var(--bg-inset)]"
                          : "border-[var(--border-default)] bg-zinc-950 hover:border-zinc-600"
                      }`}
                    >
                      <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                        {m.title}
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {m.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            <IndustrySelector
              selected={industrySlug}
              onSelect={setIndustrySlug}
            />
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!mode || !industrySlug}
              className="w-full py-3.5 px-8 bg-white text-gray-900 rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("cta.next")} →
            </button>
          </div>
        )}

        {/* Step 2 — YOUR BUSINESS */}
        {step === 2 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {t("businessHeading")}
            </h1>
            <p className="text-sm text-[var(--text-tertiary)]">
              {t("businessSubtitle")}
            </p>
            <div>
              <label htmlFor="onboarding-business-name" className="block text-xs font-medium mb-1.5 text-[var(--text-tertiary)]">{t("businessNameLabel")}</label>
              <input
                id="onboarding-business-name"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={t("businessNamePlaceholder")}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-focus)] focus:ring-1 focus:ring-zinc-500/40 focus:outline-none text-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-[var(--text-tertiary)]">{t("whatAiHandleLabel")}</label>
              <p className="text-[11px] text-[var(--text-secondary)] mb-2">{t("whatAiHandleHint")}</p>
              <div className="flex flex-wrap gap-2">
                {useCaseOptions.map(({ id, label }) => {
                  const selected = useCases.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setUseCases((prev) => (selected ? prev.filter((x) => x !== id) : [...prev, id]))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        selected ? "bg-[var(--bg-hover)] border-[var(--border-medium)] text-[var(--text-primary)]" : "bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label htmlFor="onboarding-website" className="block text-xs font-medium mb-1.5 text-[var(--text-tertiary)]">{t("websiteLabel")}</label>
              <input
                id="onboarding-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder={t("websitePlaceholder")}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                {t("websiteHint")}
              </p>
            </div>
            <div>
              <label htmlFor="onboarding-address" className="block text-xs font-medium mb-1.5 text-[var(--text-tertiary)]">{t("addressLabel")}</label>
              <input
                id="onboarding-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("addressPlaceholder")}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                {t("addressHint")}
              </p>
            </div>
            <div>
              <label htmlFor="onboarding-phone" className="block text-xs font-medium mb-1.5 text-[var(--text-tertiary)]">{t("phoneLabel")}</label>
              <input
                id="onboarding-phone"
                type="tel"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder={t("phonePlaceholder")}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2.5 px-4 rounded-xl text-sm font-medium border border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                ← {t("cta.back")}
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 px-8 bg-white text-gray-900 rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                {t("cta.next")} →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — YOUR AI AGENT */}
        {step === 3 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{t("chooseSoundsHeading")}</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {step2VoiceButtons}
            </div>
            <div>
              <label htmlFor="onboarding-greeting" className="block text-xs font-medium mb-1.5 text-[var(--text-tertiary)]">{t("openingGreetingLabel")}</label>
              <p className="text-[11px] text-[var(--text-secondary)] mb-2">{t("openingGreetingHint")}</p>
              <textarea
                id="onboarding-greeting"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder={defaultGreeting}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-focus)] focus:ring-1 focus:ring-zinc-500/40 focus:outline-none resize-none text-base"
              />
              <button
                type="button"
                onClick={() => {
                  setGreetingPlaying(true);
                  void speakTextViaApi(greetingToPlay, {
                    gender: CURATED_VOICES.find((x) => x.id === voiceId)?.gender ?? "female",
                    voiceId: voiceId || undefined,
                    onEnd: () => setGreetingPlaying(false),
                  });
                }}
                className="mt-2 flex items-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--border-default)] text-zinc-300 hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] text-sm"
              >
                {greetingPlaying ? <Waveform isPlaying /> : <span>▶</span>}
                {t("hearIt")}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-2.5 px-4 rounded-xl text-sm font-medium border border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                ← {t("cta.back")}
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 py-3.5 px-8 bg-white text-gray-900 rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                {t("cta.next")} →
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — TEACH YOUR AI */}
        {step === 4 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{t("whatShouldKnowHeading")}</h1>
            <p className="text-sm text-[var(--text-tertiary)]">{t("whatShouldKnowSubtitle")}</p>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-4">
              <p className="text-xs font-medium text-[var(--text-secondary)]">{t("businessInfoLabel")}</p>
              <div>
                <label htmlFor="onboarding-address" className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("addressLabel")}</label>
                <input
                  id="onboarding-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("addressPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-focus)] focus:ring-1 focus:ring-zinc-500/40 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="onboarding-hours" className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("hoursLabel")}</label>
                <input
                  id="onboarding-hours"
                  type="text"
                  value={businessHoursDisplay}
                  onChange={(e) => setBusinessHoursDisplay(e.target.value)}
                  placeholder={t("hoursPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-focus)] focus:ring-1 focus:ring-zinc-500/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("servicesLabel")}</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {services.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => setServices((prev) => prev.filter((x) => x !== s))}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        aria-label={t("removeAria", { item: s })}
                      >
                        &#215;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={serviceInput}
                    onChange={(e) => setServiceInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } }}
                    placeholder={t("addServicePlaceholder")}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-focus)] focus:ring-1 focus:ring-zinc-500/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addService}
                    className="shrink-0 px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] text-sm"
                  >
                    {t("add")}
                  </button>
                </div>
              </div>
            </div>
            {!starterAdded && (
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-zinc-300">
                  {t("starterEntriesCta")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const starter = buildStarterKnowledge({
                      useCases: useCases.length > 0 ? useCases : null,
                      address: address || null,
                      businessHours: { monday: { start: "09:00", end: "17:00" }, tuesday: { start: "09:00", end: "17:00" }, wednesday: { start: "09:00", end: "17:00" }, thursday: { start: "09:00", end: "17:00" }, friday: { start: "09:00", end: "17:00" } },
                      services: services.length > 0 ? services : null,
                    });
                    const withHours = businessHoursDisplay.trim()
                      ? starter.map((item) =>
                          (item.q ?? "").toLowerCase().includes("hour")
                            ? { ...item, a: businessHoursDisplay.trim() }
                            : item
                        )
                      : starter;
                    setKnowledgeItems(withHours);
                    setStarterAdded(true);
                  }}
                  className="shrink-0 py-2.5 px-4 rounded-xl bg-white text-gray-900 font-semibold text-sm hover:bg-white/90"
                >
                  {t("addThemNow")}
                </button>
              </div>
            )}
            <div className="space-y-3">
              {knowledgeItems.map((item, i) => (
                <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
                  {editingKnowledgeIdx === i ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingQ}
                        onChange={(e) => setEditingQ(e.target.value)}
                        placeholder={t("questionPrompt")}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editingA}
                        onChange={(e) => setEditingA(e.target.value)}
                        placeholder={t("answerPrompt")}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { const next = [...knowledgeItems]; next[i] = { q: editingQ.trim() || item.q || "", a: editingA.trim() || item.a || "" }; setKnowledgeItems(next); setEditingKnowledgeIdx(null); }} className="text-xs text-green-400 hover:text-green-300">Save</button>
                        <button type="button" onClick={() => setEditingKnowledgeIdx(null)} className="text-xs text-[var(--text-tertiary)] hover:text-zinc-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-[var(--text-tertiary)] mb-0.5">Q: {item.q}</p>
                      <p className="text-sm text-zinc-300 mb-2">A: {item.a}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setEditingKnowledgeIdx(i); setEditingQ(item.q ?? ""); setEditingA(item.a ?? ""); }}
                          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        >
                          {t("edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setKnowledgeItems((prev) => prev.filter((_, j) => j !== i))}
                          className="text-xs text-[var(--text-tertiary)] hover:text-red-400"
                          aria-label={t("remove")}
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setKnowledgeItems((prev) => [...prev, { q: "", a: "" }])}
                className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-medium)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] text-sm"
              >
                {t("addAnotherQa")}
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">{t("addMoreLater")}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="py-2.5 px-4 rounded-xl text-sm font-medium border border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">← {t("cta.back")}</button>
              <button type="button" onClick={() => setStep(4)} className="flex-1 py-3.5 px-8 bg-white text-gray-900 rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all">{t("cta.next")} →</button>
            </div>
          </div>
        )}

        {/* Step 5 — TEST YOUR AI */}
        {step === 5 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{t("talkToAiHeading")}</h1>
            <p className="text-sm text-[var(--text-tertiary)]">{t("talkToAiSubtitle")}</p>
            <div className="flex justify-center py-6">
              <WorkspaceVoiceButton
                title=""
                description=""
                startLabel={t("tapToStartLabel")}
                endLabel={t("endTestLabel")}
                showUnavailable={true}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">{t("scenarioSimulatorLabel")}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mb-3">{t("scenarioSimulatorHint")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="list">
                {onboardingScenarios.map((s) => (
                  <div
                    key={s.id}
                    role="listitem"
                    className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 text-left"
                  >
                    <p className="font-medium text-sm text-[var(--text-primary)]">{s.title}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{s.description}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-2">&ldquo;{s.phrase}&rdquo;</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(3)} className="py-2.5 px-4 rounded-xl text-sm font-medium border border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">← {t("cta.back")}</button>
              <button type="button" onClick={() => setStep(5)} className="flex-1 py-3.5 px-8 bg-white text-gray-900 rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all">{t("cta.next")} →</button>
            </div>
          </div>
        )}

        {/* Final — GO LIVE */}
        {step === 6 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{t("readyHeading")}</h1>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">{t("readinessChecklistLabel")}</p>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex items-center gap-2">
                  {greeting.trim() ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden /> : <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border-medium)] text-[var(--text-tertiary)]" aria-hidden />}
                  <span className={greeting.trim() ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>{t("greetingConfigured")}</span>
                </li>
                <li className="flex items-center gap-2">
                  {voiceId?.trim() ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden /> : <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border-medium)] text-[var(--text-tertiary)]" aria-hidden />}
                  <span className={voiceId?.trim() ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>{t("voiceSelected")}</span>
                </li>
                <li className="flex items-center gap-2">
                  {knowledgeItems.filter((i) => (i.q ?? "").trim() && (i.a ?? "").trim()).length >= 3 ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden /> : <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border-medium)] text-[var(--text-tertiary)]" aria-hidden />}
                  <span className={knowledgeItems.filter((i) => (i.q ?? "").trim() && (i.a ?? "").trim()).length >= 3 ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>{t("atLeast3Entries")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border-medium)] text-[var(--text-tertiary)]" aria-hidden />
                  <span className="text-[var(--text-secondary)]">{t("phoneOptional")}</span>
                </li>
              </ul>
            </div>
            <p className="text-sm text-[var(--text-tertiary)] mb-3">{t("phoneHelpParagraph")}</p>
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{t("forwardExistingTitle")}</p>
              <p className="text-xs text-[var(--text-tertiary)] mb-2">{t("forwardExistingDesc")}</p>
              <a href="/app/settings/phone" className="text-xs text-[var(--text-primary)] hover:text-[var(--text-primary)] underline">{t("showMeHow")}</a>
            </div>
            <p className="text-xs text-[var(--text-secondary)] text-center mt-3">{t("orDivider")}</p>
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{t("getNewNumberTitle")}</p>
              <p className="text-xs text-[var(--text-tertiary)] mb-2">{t("getNewNumberDesc")}</p>
              <a href="/app/settings/phone" className="inline-block py-2 px-4 rounded-xl bg-[var(--bg-hover)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-active)]">{t("getMyNumber")}</a>
            </div>
            <p className="text-xs text-[var(--text-secondary)] text-center mt-3">{t("orSkipHint")}</p>
            <button
              type="button"
              onClick={handleGoToDashboard}
              className="w-full py-3.5 px-8 bg-white text-gray-900 rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              {t("cta.finish")} →
            </button>
          </div>
        )}
          </div>
        </div>

        {showConfetti && <ConfettiOverlay />}
      </div>
    </div>
  );
}

const CONFETTI_PARTICLES = (() => {
  const dx = [-120, -90, -60, -30, 0, 30, 60, 90, 120, -100, -70, -40, 40, 70, 100, -80, -50, 50, 80, -110, -20, 20, 110, -95, -25, 25, 95, -85, -55, 55, 85, -45, 45];
  const colors = ["#fff", "#22c55e", "#a3e635", "#71717a", "#d4d4d8"];
  return dx.map((d, i) => ({ dx: d, delay: i * 35, color: colors[i % colors.length]! }));
})();

function ConfettiOverlay() {
  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
      aria-hidden
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {CONFETTI_PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-sm animate-confetti-fall"
            style={{
              left: "50%",
              top: "40%",
              marginLeft: -4,
              marginTop: -4,
              backgroundColor: p.color,
              ["--confetti-dx" as string]: `${p.dx}px`,
              animationDelay: `${p.delay}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
