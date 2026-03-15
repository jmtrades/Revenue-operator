"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { previewVoiceViaApi } from "@/lib/voice-preview";
import { CURATED_VOICES, DEFAULT_VOICE_ID } from "@/lib/constants/curated-voices";
import { getServicesForIndustry, getIndustryLabel } from "@/lib/constants/industries";
import type { ActivationState, ElevenLabsVoice, StepId, TestFeedback } from "./steps/types";
import { DEFAULT_HOURS, STEPS } from "./steps/types";
import { BusinessStep } from "./steps/BusinessStep";
import { AgentStep } from "./steps/AgentStep";
import { CustomizeStep } from "./steps/CustomizeStep";
import { TestStep } from "./steps/TestStep";
import { ActivateStep } from "./steps/ActivateStep";

export function ActivateWizard() {
  const t = useTranslations("activate");
  const [step, setStep] = useState<StepId>(1);
  const [state, setState] = useState<ActivationState>(() => ({
    businessName: "",
    industry: null,
    businessPhone: "",
    orgType: null,
    useCases: [],
    agentTemplate: null,
    agentName: "",
    hours: DEFAULT_HOURS,
    greeting: "Hi, thanks for calling. How can I help you today?",
    services: [],
    lastTestFeedback: null,
    preferredLanguage: "en",
    elevenlabsVoiceId: DEFAULT_VOICE_ID,
  }));

  const currentIndex = useMemo(
    () => STEPS.findIndex((s) => s.id === step),
    [step],
  );

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return (
        state.businessName.trim().length > 0 &&
        state.businessPhone.trim().length > 0
      );
    }
    if (step === 2) {
      return Boolean(state.agentTemplate);
    }
    if (step === 3) {
      return state.agentName.trim().length > 0 && state.greeting.trim().length > 0;
    }
    if (step === 4) {
      return false;
    }
    return true;
  }, [step, state]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    setStep((prev) => {
      const next = prev < 5 ? ((prev + 1) as StepId) : prev;
      if (prev === 1) {
        try {
          const bn = state.businessName.trim();
          if (bn) localStorage.setItem("rt_business_name", bn);
        } catch { /* ignore */ }
      }
      return next;
    });
  }, [canGoNext, state.businessName]);

  const goBack = useCallback(() => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as StepId) : prev));
  }, []);

  const handleKeyDownAdvance = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    e.preventDefault();
    goNext();
  };

  const industryServices =
    getServicesForIndustry(state.industry);

  const effectiveServices =
    state.services.length > 0 ? state.services : industryServices;

  const curatedVoiceList = useMemo(
    () => CURATED_VOICES.map((v) => ({ id: v.id, name: v.name, labels: {} as Record<string, string>, category: v.accent })),
    []
  );
  const [voices, setVoices] = useState<ElevenLabsVoice[]>(() => curatedVoiceList);
  useEffect(() => {
    if (step !== 3) return;
    fetch("/api/agent/voices")
      .then((r) => r.json())
      .then((data: { voices?: ElevenLabsVoice[] }) => {
        const fromApi = data.voices ?? [];
        setVoices(fromApi.length > 0 ? fromApi : curatedVoiceList);
      })
      .catch(() => setVoices(curatedVoiceList));
  }, [step, curatedVoiceList]);

  const handlePlayTestGreeting = () => {
    const voiceText =
      state.greeting.trim().length > 0
        ? state.greeting.trim()
        : t("greetingWithBusiness", { business: state.businessName || t("yourBusiness") });
    previewVoiceViaApi(voiceText, {
      voiceId: state.elevenlabsVoiceId || undefined,
      gender: "female",
    });
  };

  const handleThumb = (fb: TestFeedback) => {
    setState((prev) => ({ ...prev, lastTestFeedback: fb }));
    if (fb === "up") {
      setStep(5);
    } else if (fb === "down") {
      setStep(3);
    }
  };

  const handleFinalize = useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault();
    try {
      if (state.businessName.trim()) {
        localStorage.setItem("rt_business_name", state.businessName.trim());
      }
      const existing = (() => {
        try {
          const raw = localStorage.getItem("rt_signup") ?? localStorage.getItem("recalltouch_signup");
          return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch { return {}; }
      })();
      localStorage.setItem("rt_signup", JSON.stringify({ ...existing, businessName: state.businessName.trim() }));

      const hoursObj = state.hours?.length
        ? { days: state.hours.map((h) => h.day), start: state.hours[0]?.start ?? "09:00", end: state.hours[0]?.end ?? "17:00", timezone: "UTC" }
        : undefined;
      const res = await fetch("/api/workspace/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: state.businessName.trim() || "My Workspace",
          businessPhone: state.businessPhone.trim() || undefined,
          industry: state.industry ?? undefined,
          orgType: state.orgType ?? undefined,
          agentTemplate: state.agentTemplate ?? undefined,
          agentName: state.agentName || undefined,
          greeting: state.greeting || undefined,
          businessHours: hoursObj,
          knowledgeItems: state.services?.length ? state.services.map((s) => ({ type: "service", value: s })) : undefined,
          preferredLanguage: state.preferredLanguage || "en",
          elevenlabsVoiceId: state.elevenlabsVoiceId || undefined,
        }),
      });
      if (res.ok) {
        fetch("/api/vapi/create-agent", { method: "POST", credentials: "include" }).catch(() => {});
      }
    } catch { /* ignore */ }
    if (typeof localStorage !== "undefined") localStorage.setItem("rt_onboarded", "true");
    window.location.href = "/app/activity";
  }, [state]);

  return (
    <Container>
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-sky-400">
            {t("wizardHeading")}
          </p>
          <h1 className="mt-3 text-2xl md:text-3xl font-semibold text-slate-50">
            {t("wizardTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xl">
            {t("wizardSubtitle")}
          </p>
        </header>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-400">
              Step {currentIndex + 1} of {STEPS.length}
            </p>
            <p className="text-xs text-slate-500 hidden sm:block">
              {STEPS[currentIndex]?.label}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {STEPS.map((s, idx) => {
              const isActive = s.id === step;
              const isCompleted = idx < currentIndex;
              return (
                <div key={s.id} className="flex-1 flex items-center gap-2">
                  <button
                    type="button"
                    className={`h-2.5 w-2.5 rounded-full border transition-colors ${
                      isActive
                        ? "bg-sky-400 border-sky-300"
                        : isCompleted
                          ? "bg-sky-500/50 border-sky-400/70"
                          : "border-slate-600"
                    }`}
                    aria-label={s.label}
                    onClick={() => setStep(s.id)}
                  />
                  <span className="hidden md:inline text-[11px] text-slate-500">
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <section
          className="rounded-2xl border border-slate-800 bg-slate-950/40 px-5 py-6 md:px-7 md:py-7 shadow-[0_18px_50px_rgba(15,23,42,0.7)] transition-[opacity,transform] duration-200"
          onKeyDown={step <= 3 ? handleKeyDownAdvance : undefined}
        >
          {step === 1 && (
            <BusinessStep state={state} setState={setState} goNext={goNext} canGoNext={canGoNext} />
          )}
          {step === 2 && (
            <AgentStep
              state={state}
              setState={setState}
              goBack={goBack}
              goNext={goNext}
              canGoNext={canGoNext}
              getIndustryLabel={getIndustryLabel}
            />
          )}
          {step === 3 && (
            <CustomizeStep
              state={state}
              setState={setState}
              voices={voices}
              industryServices={industryServices}
              effectiveServices={effectiveServices}
              onPlayGreeting={handlePlayTestGreeting}
              goBack={goBack}
              goNext={goNext}
              canGoNext={canGoNext}
            />
          )}
          {step === 4 && (
            <TestStep
              onPlayGreeting={handlePlayTestGreeting}
              onThumb={handleThumb}
              goBack={goBack}
            />
          )}
          {step === 5 && (
            <ActivateStep onFinalize={handleFinalize} goBack={goBack} />
          )}
        </section>
      </div>
    </Container>
  );
}

