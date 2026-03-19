"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { previewVoiceViaApi } from "@/lib/voice-preview";
import { RECALL_VOICES, DEFAULT_RECALL_VOICE_ID } from "@/lib/constants/recall-voices";
import { getServicesForIndustry } from "@/lib/constants/industries";
import type { ActivationState, ElevenLabsVoice, StepId } from "./steps/types";
import { DEFAULT_HOURS, STEPS } from "./steps/types";
import { ModeStep } from "./steps/ModeStep";
import { PackBusinessStep } from "./steps/PackBusinessStep";
import { PhoneOnlyStep } from "./steps/PhoneOnlyStep";
import { CustomizeStep } from "./steps/CustomizeStep";
import { ActivateStep } from "./steps/ActivateStep";
import { track } from "@/lib/analytics/posthog";

export function ActivateWizard() {
  const t = useTranslations("activate");
  const tTeam = useTranslations("team");
  const [step, setStep] = useState<StepId>(1);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [state, setState] = useState<ActivationState>(() => ({
    businessName: "",
    industry: null,
    industryPackId: null,
    businessLocation: "",
    businessPhone: "",
    orgType: null,
    useCases: ["answer", "book", "followup"],
    agentTemplate: null,
    agentName: "Alex",
    hours: DEFAULT_HOURS,
    greeting: t("defaultGreeting"),
    services: [],
    lastTestFeedback: null,
    preferredLanguage: "en",
    voiceId: DEFAULT_RECALL_VOICE_ID,
  }));

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        if (!active) return;
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { session?: { email?: string | null; emailVerified?: boolean } | null } | null;
        const s = data?.session ?? null;
        setAccountEmail(s?.email ?? null);
        if (typeof s?.emailVerified === "boolean") setEmailVerified(s.emailVerified);
      } catch {
        // Ignore: banner is best-effort
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const currentIndex = useMemo(
    () => STEPS.findIndex((s) => s.id === step),
    [step],
  );

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return state.orgType === "solo" || state.orgType === "business" || state.orgType === "agency";
    }
    if (step === 2) {
      return (
        state.businessName.trim().length > 0 &&
        Boolean(state.industryPackId) &&
        state.businessLocation.trim().length > 0
      );
    }
    if (step === 3) {
      return state.businessPhone.replace(/\D/g, "").length >= 10;
    }
    if (step === 4) {
      return state.agentName.trim().length > 0 && state.greeting.trim().length > 0;
    }
    return true;
  }, [step, state]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    const current = step;
    if (current >= 1 && current <= 4) {
      const name =
        current === 1 ? "industry" : current === 2 ? "phone_number" : current === 3 ? "voice" : "hours";
      track("onboarding_step_completed", { step: current, name });
    }
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
  }, [canGoNext, state.businessName, step]);

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

  const recallVoiceList = useMemo(
    () => RECALL_VOICES.map((v) => ({ id: v.id, name: v.name, labels: {} as Record<string, string>, category: v.accent })),
    []
  );
  const [voices, _setVoices] = useState<ElevenLabsVoice[]>(() => recallVoiceList);

  const handlePlayTestGreeting = () => {
    const voiceText =
      state.greeting.trim().length > 0
        ? state.greeting.trim()
        : t("greetingWithBusiness", { business: state.businessName || t("yourBusiness") });
    previewVoiceViaApi(voiceText, {
      voiceId: state.voiceId || undefined,
      gender: "female",
    });
  };

  const handleFinalize = useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault();
    try {
      track("onboarding_step_completed", { step: 5, name: "test_call" });
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
          voiceId: state.voiceId || undefined,
        }),
      });
      if (!res.ok) {
        console.error("[activate] Onboard API returned", res.status);
      }
    } catch (err) {
      console.error("[activate] Onboard failed:", err instanceof Error ? err.message : err);
    }
    if (typeof localStorage !== "undefined") localStorage.setItem("rt_onboarded", "true");
    window.location.href = "/app/activity";
  }, [state]);

  return (
    <Container>
      <div className="max-w-4xl mx-auto">
        {emailVerified === false && (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/40 px-5 py-4">
            <p className="text-sm font-semibold text-slate-50">{t("emailNotVerifiedBannerTitle")}</p>
            <p className="mt-1 text-sm text-slate-300">{t("emailNotVerifiedBannerBody")}</p>
            <div className="mt-3">
              <button
                type="button"
                onClick={async () => {
                  if (!accountEmail || resending) return;
                  setResending(true);
                  try {
                    await fetch("/api/auth/resend-verification", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: accountEmail }),
                    });
                  } catch {
                    // best-effort
                  } finally {
                    setResending(false);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black font-semibold px-6 py-2 hover:bg-zinc-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!accountEmail || resending}
              >
                {resending ? tTeam("sending") : t("resendVerificationCta")}
              </button>
            </div>
          </div>
        )}
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
            <ModeStep state={state} setState={setState} goNext={goNext} canGoNext={canGoNext} />
          )}
          {step === 2 && (
            <PackBusinessStep state={state} setState={setState} goNext={goNext} canGoNext={canGoNext} />
          )}
          {step === 3 && (
            <PhoneOnlyStep
              state={state}
              setState={setState}
              goNext={goNext}
              goBack={goBack}
              canGoNext={canGoNext}
            />
          )}
          {step === 4 && (
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
          {step === 5 && (
            <ActivateStep onFinalize={handleFinalize} goBack={goBack} />
          )}
        </section>
      </div>
    </Container>
  );
}

