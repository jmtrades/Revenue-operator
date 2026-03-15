"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";

const STEPS = 5;
const INDUSTRY_VALUES = ["home_services", "healthcare", "legal", "real_estate", "insurance", "b2b_sales", "local_business", "contractors"] as const;
const AGENT_NAMES = ["Sarah", "Alex", "Emma", "James", "Mike", "Lisa"];
const VOICE_IDS = ["warm", "professional", "casual", "calm"] as const;

function OnboardingWizard() {
  const t = useTranslations("dashboard.onboardingWizard");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId, workspaces, loadWorkspaces } = useWorkspace();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const industries = useMemo(() => INDUSTRY_VALUES.map((value) => ({ value, label: t(`industries.${value}`) })), [t]);
  const voices = useMemo(() => VOICE_IDS.map((id) => ({ id, label: t(`voices.${id}`) })), [t]);

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");

  // Step 2
  const [agentName, setAgentName] = useState("Sarah");
  const [voiceId, setVoiceId] = useState("warm");
  const [greeting, setGreeting] = useState("");
  const [capabilities, _setCapabilities] = useState<string[]>(["answer_questions", "capture_leads", "book_appointments", "handle_emergencies", "send_texts", "block_spam"]);

  // Step 3
  const [services, setServices] = useState("");
  const [emergenciesAfterHours, setEmergenciesAfterHours] = useState<"call_me" | "message" | "next_day">("call_me");
  const [appointmentHandling, setAppointmentHandling] = useState<"calendar" | "capture">("calendar");
  const [faqExtra, setFaqExtra] = useState("");

  // Step 4
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [numberOption, setNumberOption] = useState<"forward" | "main" | "later">("main");
  const [provisioning, setProvisioning] = useState(false);

  const wid = workspaceId || searchParams.get("workspace_id") || (workspaces.length > 0 ? workspaces[0]?.id : null);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (!wid) return;
    if (searchParams.get("zoom_connected") === "1") {
      setStep(5);
      return;
    }
  }, [wid, searchParams]);

  const saveStep1 = useCallback(async () => {
    if (!wid) return;
    setSaving(true);
    setError(null);
    try {
      const ctxRes = await fetch(`/api/workspaces/${wid}/business-context`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName || t("myBusiness"),
          offer_summary: industry ? `${industry.replace(/_/g, " ")} services` : "",
        }),
      });
      if (!ctxRes.ok) throw new Error("FAILED_SAVE");
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "SOMETHING_WRONG");
    } finally {
      setSaving(false);
    }
  }, [wid, businessName, industry, t]);

  const saveStep2 = useCallback(async () => {
    if (!wid) return;
    setSaving(true);
    setError(null);
    try {
      const greetingText = greeting.trim() || t("greetingPlaceholder", { business: businessName || t("theBusiness"), agent: agentName });
      const res = await fetch("/api/onboarding/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: wid,
          agent_name: agentName,
          voice_id: voiceId,
          greeting: greetingText,
          capabilities,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "FAILED_SAVE_AGENT");
      }
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "SOMETHING_WRONG");
    } finally {
      setSaving(false);
    }
  }, [wid, agentName, voiceId, greeting, capabilities, businessName, t]);

  const saveStep3 = useCallback(async () => {
    if (!wid) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: wid,
          services: services.trim() || undefined,
          emergencies_after_hours: emergenciesAfterHours,
          appointment_handling: appointmentHandling,
          faq_extra: faqExtra.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("FAILED_SAVE");
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "SOMETHING_WRONG");
    } finally {
      setSaving(false);
    }
  }, [wid, services, emergenciesAfterHours, appointmentHandling, faqExtra]);

  const provisionNumber = useCallback(async () => {
    if (!wid) return;
    setProvisioning(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/twilio/auto-provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: wid }),
      });
      const data = (await res.json().catch(() => ({}))) as { phone_number?: string; error?: string };
      if (data.phone_number) {
        setPhoneNumber(data.phone_number);
        return;
      }
      if (!res.ok) {
        const fallback = await fetch("/api/onboarding/number", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_id: wid }),
        });
        const fallbackData = (await fallback.json().catch(() => ({}))) as { phone_number?: string; stub?: boolean };
        if (fallbackData.phone_number) {
          setPhoneNumber(fallbackData.phone_number);
          setError(null);
          return;
        }
      }
      if (data.error) setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "SOMETHING_WRONG");
    } finally {
      setProvisioning(false);
    }
  }, [wid]);

  const finishOnboarding = useCallback(async () => {
    if (!wid) return;
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem("rt_onboarded", "1");
      await fetch(`/api/activation?workspace_id=${encodeURIComponent(wid)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      });
    } catch {
      // ignore
    }
    router.push(`/dashboard/activity?workspace_id=${encodeURIComponent(wid)}`);
  }, [wid, router]);

  if (workspaces.length === 0 && !wid) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{t("getStartedHeading")}</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{t("getStartedSubtitle")}</p>
          <Link href="/activate" className="inline-block py-2.5 px-4 rounded-xl font-semibold text-sm bg-white text-black hover:bg-zinc-100 transition-colors">{t("startFree")}</Link>
        </div>
      </div>
    );
  }

  const _progress = (step / STEPS) * 100;

  return (
    <div className="min-h-screen flex flex-col p-6 md:p-12" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <div className="max-w-lg mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            {Array.from({ length: STEPS }, (_, i) => i + 1).map((s) => (
              <span
                key={s}
                className="inline-block w-2.5 h-2.5 rounded-full transition-colors"
                style={{
                  background: s <= step ? "var(--accent-primary)" : "var(--bg-elevated)",
                }}
                aria-hidden
              />
            ))}
          </div>
          <p className="text-xs text-center" style={{ color: "var(--text-tertiary)" }}>{t("stepOf", { step, total: STEPS })}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "var(--meaning-red)", color: "#fff" }}>{error}</div>
        )}

        {/* Step 1: Your business */}
        {step === 1 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{t("tellUsAboutBusiness")}</h1>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("businessName")}</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={t("businessNamePlaceholder")}
                className="w-full px-4 py-3 rounded-lg border"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("websiteOptional")}</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder={t("websitePlaceholder")}
                className="w-full px-4 py-3 rounded-lg border"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <span className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>{t("industry")}</span>
              <div className="flex flex-wrap gap-2">
                {industries.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setIndustry(value)}
                    className="px-3 py-2 rounded-lg text-sm font-medium border"
                    style={{
                      background: industry === value ? "var(--accent-primary-subtle)" : "var(--surface)",
                      borderColor: industry === value ? "var(--accent-primary)" : "var(--card-border)",
                      color: industry === value ? "var(--accent-primary)" : "var(--text-secondary)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={saveStep1} disabled={saving} className="w-full py-3 rounded-lg font-medium text-sm disabled:opacity-50" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>
              {saving ? t("saving") : t("continue")}
            </button>
          </div>
        )}

        {/* Step 2: Meet your AI agent */}
        {step === 2 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{t("meetReceptionist")}</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("agentWillAnswerFor", { name: businessName || t("theBusiness") })}</p>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("agentName")}</label>
              <select
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              >
                {AGENT_NAMES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("voice")}</label>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("greetingOptional")}</label>
              <textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder={t("greetingPlaceholder", { business: businessName || t("theBusiness"), agent: agentName })}
                rows={2}
                className="w-full px-4 py-3 rounded-lg border text-sm"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setStep(1)} className="py-2.5 px-4 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>{t("back")}</button>
              <button onClick={saveStep2} disabled={saving} className="flex-1 py-3 rounded-lg font-medium text-sm disabled:opacity-50" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>{saving ? t("saving") : t("continue")}</button>
            </div>
          </div>
        )}

        {/* Step 3: Teach your AI */}
        {step === 3 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{t("teachAgentAbout", { name: agentName })}</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("moreYouShare")}</p>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("whatServicesOffer")}</label>
              <textarea
                value={services}
                onChange={(e) => setServices(e.target.value)}
                placeholder={t("servicesPlaceholder")}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border text-sm"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <span className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>{t("handleEmergenciesAfterHours")}</span>
              <div className="space-y-2">
                {(["call_me", "message", "next_day"] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="emergencies" checked={emergenciesAfterHours === opt} onChange={() => setEmergenciesAfterHours(opt)} className="rounded-full" />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                      {opt === "call_me" && t("optCallMe")}
                      {opt === "message" && t("optMessage")}
                      {opt === "next_day" && t("optNextDay")}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>{t("howAppointmentsHandled")}</span>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="appt" checked={appointmentHandling === "calendar"} onChange={() => setAppointmentHandling("calendar")} className="rounded-full" />
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{t("apptCalendar")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="appt" checked={appointmentHandling === "capture"} onChange={() => setAppointmentHandling("capture")} className="rounded-full" />
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{t("apptCapture")}</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("anythingCallersAsk")}</label>
              <textarea
                value={faqExtra}
                onChange={(e) => setFaqExtra(e.target.value)}
                placeholder={t("faqPlaceholder")}
                rows={2}
                className="w-full px-4 py-3 rounded-lg border text-sm"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setStep(2)} className="py-2.5 px-4 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>{t("back")}</button>
              <button onClick={saveStep3} disabled={saving} className="flex-1 py-3 rounded-lg font-medium text-sm disabled:opacity-50" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>{saving ? t("saving") : t("continue")}</button>
            </div>
          </div>
        )}

        {/* Step 4: Your phone number */}
        {step === 4 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{t("yourBusinessNumber")}</h1>
            {!phoneNumber ? (
              <>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("youllGetNumber")}</p>
                <button onClick={provisionNumber} disabled={provisioning} className="w-full py-3 rounded-lg font-medium text-sm disabled:opacity-50" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>
                  {provisioning ? t("gettingNumber") : t("getMyNumber")}
                </button>
              </>
            ) : (
              <>
                <div className="p-4 rounded-xl text-center" style={{ background: "var(--bg-elevated)" }}>
                  <p className="text-2xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{phoneNumber}</p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("thisIsRecallTouchNumber")}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{t("chooseHowToUse")}</p>
                  {[
                    { value: "forward" as const, labelKey: "forwardExisting" as const, subKey: "forwardSub" as const },
                    { value: "main" as const, labelKey: "useAsBusinessNumber" as const, subKey: "useAsSub" as const },
                    { value: "later" as const, labelKey: "setUpLater" as const, subKey: null },
                  ].map(({ value, labelKey, subKey }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setNumberOption(value)}
                      className="w-full text-left p-3 rounded-lg border"
                      style={{
                        background: numberOption === value ? "var(--accent-primary-subtle)" : "var(--surface)",
                        borderColor: numberOption === value ? "var(--accent-primary)" : "var(--card-border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <span className="text-sm font-medium block">{t(labelKey)}</span>
                      {subKey && <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t(subKey)}</span>}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setStep(3)} className="py-2.5 px-4 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>{t("back")}</button>
                  <button onClick={() => setStep(5)} className="flex-1 py-3 rounded-lg font-medium text-sm" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>{t("continue")}</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 5: Test your AI */}
        {step === 5 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{t("agentReadyTest")}</h1>
            {phoneNumber && (
              <div className="p-6 rounded-xl text-center" style={{ background: "var(--bg-elevated)" }}>
                <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{t("callThisNumber")}</p>
                <p className="text-2xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>{phoneNumber}</p>
                <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>{t("tryPhrase")}</p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("whenYouCallAppear")}</p>
              </div>
            )}
            {!phoneNumber && (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("addNumberLaterInSettings")}</p>
            )}
            <div className="flex flex-col gap-2">
              <button onClick={finishOnboarding} className="w-full py-3 rounded-lg font-medium text-sm" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>
                {t("takeMeToDashboard")}
              </button>
              <button type="button" onClick={finishOnboarding} className="w-full py-2.5 rounded-lg text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>
                {t("skipTestLater")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OnboardingPageFallback() {
  const t = useTranslations("dashboard.onboardingWizard");
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("oneMoment")}</p>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingPageFallback />}>
      <OnboardingWizard />
    </Suspense>
  );
}
