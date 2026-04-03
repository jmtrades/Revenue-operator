"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { previewVoiceViaApi } from "@/lib/voice-preview";
import { RECALL_VOICES, DEFAULT_RECALL_VOICE_ID } from "@/lib/constants/recall-voices";
import { getServicesForIndustry } from "@/lib/constants/industries";
import type { ActivationState, VoiceOption, StepId } from "./steps/types";
import { DEFAULT_HOURS, STEPS } from "./steps/types";
import type { PlanSlug } from "@/lib/billing-plans";
import { PlanStep } from "./steps/PlanStep";
import { GoalStep } from "./steps/GoalStep";
import { PackBusinessStep } from "./steps/PackBusinessStep";
import { PhoneOnlyStep } from "./steps/PhoneOnlyStep";
import { CustomizeStep } from "./steps/CustomizeStep";
import { ActivateStep } from "./steps/ActivateStep";
import { track } from "@/lib/analytics/posthog";

export function ActivateWizard() {
  const t = useTranslations("activate");
  const _tTeam = useTranslations("team");
  const searchParams = useSearchParams();
  const prefillEmail = searchParams.get("email") ?? null;
  const prefillPlan = searchParams.get("plan") ?? null;
  // Restore progress from localStorage on mount
  const STORAGE_KEY = "rt_activate_progress";
  const savedProgress = typeof window !== "undefined" ? (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as { step?: number; plan?: string; state?: Partial<ActivationState> } : null;
    } catch { return null; }
  })() : null;

  const [step, setStep] = useState<StepId>((savedProgress?.step as StepId) ?? 1);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(prefillEmail);
  const [resending, setResending] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanSlug | null>((prefillPlan as PlanSlug) || (savedProgress?.plan as PlanSlug) || null);
  const [state, setState] = useState<ActivationState>(() => ({
    businessName: savedProgress?.state?.businessName ?? "",
    industry: savedProgress?.state?.industry ?? null,
    industryPackId: savedProgress?.state?.industryPackId ?? null,
    businessLocation: savedProgress?.state?.businessLocation ?? "",
    businessPhone: savedProgress?.state?.businessPhone ?? "",
    orgType: savedProgress?.state?.orgType ?? null,
    useCases: savedProgress?.state?.useCases ?? ["answer", "book", "followup"],
    agentTemplate: savedProgress?.state?.agentTemplate ?? null,
    agentName: savedProgress?.state?.agentName ?? "Alex",
    hours: savedProgress?.state?.hours ?? DEFAULT_HOURS,
    greeting: savedProgress?.state?.greeting ?? t("defaultGreeting"),
    services: savedProgress?.state?.services ?? [],
    lastTestFeedback: null,
    preferredLanguage: savedProgress?.state?.preferredLanguage ?? "en",
    voiceId: savedProgress?.state?.voiceId ?? DEFAULT_RECALL_VOICE_ID,
    goals: savedProgress?.state?.goals ?? [],
  }));

  // Auto-save progress to localStorage on step/state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, plan: selectedPlan, state }));
    } catch { /* storage full or unavailable */ }
  }, [step, selectedPlan, state]);
  const [error, setError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        if (!active) return;
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { session?: { email?: string | null; emailVerified?: boolean } | null } | null;
        const s = data?.session ?? null;
        setAccountEmail(s?.email ?? prefillEmail ?? null);
        if (typeof s?.emailVerified === "boolean") setEmailVerified(s.emailVerified);
      } catch {
        // Ignore: banner is best-effort
      }
    })();
    return () => {
      active = false;
    };
  }, [prefillEmail]);

  const currentIndex = useMemo(
    () => STEPS.findIndex((s) => s.id === step),
    [step],
  );

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return selectedPlan !== null;
    }
    if (step === 2) {
      return state.goals.length > 0;
    }
    if (step === 3) {
      const digits = state.businessPhone.replace(/\D/g, "");
      // Require 10-15 digits and not all zeros
      return digits.length >= 10 && digits.length <= 15 && !/^0+$/.test(digits);
    }
    return true;
  }, [step, state, selectedPlan]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    const current = step;
    if (current >= 1 && current <= 4) {
      const name =
        current === 1 ? "plan" : current === 2 ? "goals" : current === 3 ? "phone" : "activate";
      track("onboarding_step_completed", { step: current, name });
    }
    setStep((prev) => {
      const next = prev < 4 ? ((prev + 1) as StepId) : prev;
      if (prev === 2) {
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
    if (finalizing) return;
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
  const [voices, _setVoices] = useState<VoiceOption[]>(() => recallVoiceList);

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
    if (finalizing) return;

    // Block finalization if email not verified — catch early instead of getting a 403
    if (emailVerified === false) {
      setError(t("errors.emailNotVerified", { defaultValue: "Please verify your email before going live. Check your inbox for a verification link." }));
      return;
    }

    setFinalizing(true);
    setError(null);

    try {
      track("onboarding_step_completed", { step: 3, name: "go_live" });
      if (state.businessName.trim()) {
        localStorage.setItem("rt_business_name", state.businessName.trim());
      }
      const existing = (() => {
        try {
          const raw = localStorage.getItem("rt_signup") ?? localStorage.getItem("revenueoperator_signup");
          return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch { return {}; }
      })();
      localStorage.setItem("rt_signup", JSON.stringify({ ...existing, businessName: state.businessName.trim() }));

      const hoursObj = state.hours?.length
        ? { days: state.hours.map((h) => h.day), start: state.hours[0]?.start ?? "09:00", end: state.hours[0]?.end ?? "17:00", timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; } })() }
        : undefined;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
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
            billingTier: selectedPlan || undefined,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          console.error("[activate] Onboard API returned", res.status);
          setError(t("errors.setupFailed", { defaultValue: "Could not complete workspace setup. Please try again." }));
          setFinalizing(false);
          return;
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          console.error("[activate] Onboard API timeout");
          setError(t("errors.timeout", { defaultValue: "This is taking longer than expected. Please try again." }));
        } else {
          throw fetchErr;
        }
        setFinalizing(false);
        return;
      }
    } catch (err) {
      console.error("[activate] Onboard failed:", err instanceof Error ? err.message : err);
      setError(t("errors.connectionError", { defaultValue: "Connection error. Please check your internet and try again." }));
      setFinalizing(false);
      return;
    }
    // Mark onboarding as completed in the database
    try {
      await fetch("/api/workspace/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingCompletedAt: new Date().toISOString() }),
      });
    } catch {
      // Non-blocking — workspace was created, onboarding flag can be retried
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("rt_onboarded", "true");
      localStorage.removeItem(STORAGE_KEY); // Clear saved progress after successful setup
    }
    window.location.href = "/app/dashboard";
  }, [state, selectedPlan, t, finalizing, emailVerified]);

  return (
    <Container>
      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="mb-6 rounded-2xl border border-[var(--accent-danger)]/30 bg-[var(--accent-danger-subtle)] px-5 py-4">
            <p className="text-sm font-semibold text-[var(--accent-danger)]">{t("errors.title", { defaultValue: "Setup Error" })}</p>
            <p className="mt-1 text-sm text-[var(--accent-danger)]/80">{error}</p>
            <button type="button" onClick={() => setError(null)} className="mt-2 text-xs text-[var(--accent-danger)] hover:text-[var(--accent-danger-hover)] underline">{t("errors.dismiss", { defaultValue: "Dismiss" })}</button>
          </div>
        )}
        {emailVerified === false && (
          <div className="mb-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]/80 px-5 py-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("emailNotVerifiedBannerTitle")}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("emailNotVerifiedBannerBody")}</p>
            <div className="mt-3">
              <button
                type="button"
                onClick={async () => {
                  if (!accountEmail || resending) return;
                  setResending(true);
                  try {
                    const res = await fetch("/api/auth/resend-verification", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: accountEmail }),
                    });
                    if (res.ok) {
                      setError(null);
                      // Show brief success inline
                      setResending(true);
                      setTimeout(() => setResending(false), 3000);
                    }
                  } catch {
                    // best-effort
                  } finally {
                    setTimeout(() => setResending(false), 3000);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold px-6 py-2 hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!accountEmail || resending}
              >
                {resending ? t("verificationSent", { defaultValue: "Verification email sent! Check your inbox." }) : t("resendVerificationCta")}
              </button>
            </div>
          </div>
        )}
        <header className="mb-10">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-sky-400">
            {t("wizardHeading")}
          </p>
          <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {t("wizardTitle")}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-tertiary)] max-w-xl">
            {t("wizardSubtitle")}
          </p>
        </header>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">
              Step {currentIndex + 1} of {STEPS.length}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] hidden sm:block">
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
                    className={`h-2.5 w-2.5 rounded-full border transition-colors duration-200 ${
                      isActive
                        ? "bg-sky-400 border-sky-300"
                        : isCompleted
                          ? "bg-sky-500/50 border-sky-400/70"
                          : "border-[var(--border-default)]"
                    }`}
                    aria-label={s.label}
                    onClick={() => setStep(s.id)}
                  />
                  <span className="hidden md:inline text-[11px] text-[var(--text-tertiary)]">
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <section
          className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] px-5 py-6 md:px-7 md:py-7 shadow-[0_18px_50px_rgba(15,23,42,0.7)] transition-[opacity,transform] duration-200"
          onKeyDown={step <= 3 ? handleKeyDownAdvance : undefined}
        >
          {step === 1 && (
            <PlanStep
              selectedPlan={selectedPlan}
              onSelectPlan={setSelectedPlan}
              onNext={goNext}
              canGoNext={canGoNext}
            />
          )}
          {step === 2 && (
            <GoalStep state={state} onUpdate={(patch) => setState((p) => ({ ...p, ...patch }))} onNext={goNext} />
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
            <>
              <PackBusinessStep state={state} setState={setState} goNext={goNext} canGoNext={canGoNext} />
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
              <ActivateStep
                onFinalize={handleFinalize}
                goBack={goBack}
                finalizing={finalizing}
                phoneNumber={state.businessPhone}
                agentName={state.agentName}
                voiceId={state.voiceId}
                greeting={state.greeting}
              />
            </>
          )}
        </section>
      </div>
    </Container>
  );
}

