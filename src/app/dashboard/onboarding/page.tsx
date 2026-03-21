"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";
import {
  ChevronRight,
  Volume2,
  CheckCircle2,
  Phone,
  Sparkles,
  Clock,
  Zap,
  Calendar,
  AlertCircle,
} from "lucide-react";

const STEPS = 5;
const INDUSTRY_VALUES = ["home_services", "healthcare", "legal", "real_estate", "insurance", "b2b_sales", "local_business", "contractors"] as const;
const AGENT_NAMES = ["Sarah", "Alex", "Emma", "James", "Rachel", "Charlotte"];
const VOICE_IDS = [
  "us-female-warm-receptionist",   // Sarah — warm & welcoming
  "us-male-professional",           // Adam — professional & clear
  "us-female-casual",               // Emma — casual & friendly
  "uk-female-warm",                 // Charlotte — warm British
  "us-male-warm",                   // James — warm & reassuring
  "us-female-calm",                 // Rachel — calm & empathetic
  "us-male-confident",              // Sam — confident & energetic
  "uk-male-authoritative",          // George — authoritative British
] as const;

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
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const wid = workspaceId || searchParams.get("workspace_id") || (workspaces.length > 0 ? workspaces[0]?.id : null);

  const playVoicePreview = useCallback(async (voice: string) => {
    setPlayingVoice(voice);
    try {
      const previewText = `Hi there, thanks so much for calling. I'd love to help you out — what can I do for you today?`;
      const res = await fetch(
        `/api/demo/voice-preview?voice_id=${encodeURIComponent(voice)}&text=${encodeURIComponent(previewText)}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => { URL.revokeObjectURL(url); setPlayingVoice(null); };
        audio.onerror = () => { URL.revokeObjectURL(url); setPlayingVoice(null); };
        await audio.play();
        return;
      }
    } catch {
      // Voice service unavailable
    }
    setPlayingVoice(null);
  }, []);

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
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            {step === 1 && <Sparkles size={24} style={{ color: "var(--accent-primary)" }} />}
            {step === 2 && <Volume2 size={24} style={{ color: "var(--accent-primary)" }} />}
            {step === 3 && <Zap size={24} style={{ color: "var(--accent-primary)" }} />}
            {step === 4 && <Phone size={24} style={{ color: "var(--accent-primary)" }} />}
            {step === 5 && <CheckCircle2 size={24} style={{ color: "var(--accent-primary)" }} />}
            <span className="text-sm font-semibold" style={{ color: "var(--accent-primary)" }}>{t("stepOf", { step, total: STEPS })}</span>
          </div>

          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
            <div className="h-full transition-all duration-500" style={{
              background: "var(--accent-primary)",
              width: `${(step / STEPS) * 100}%`,
            }} />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg text-sm flex gap-3" style={{ background: "var(--meaning-red)", color: "#fff" }}>
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Your business */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{t("tellUsAboutBusiness")}</h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Help us customize your AI phone agent</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Sparkles size={18} style={{ color: "var(--accent-primary)" }} />
                {t("businessName")}
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={t("businessNamePlaceholder")}
                className="w-full px-4 py-3 rounded-lg border text-base"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Phone size={18} style={{ color: "var(--accent-primary)" }} />
                {t("websiteOptional")}
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder={t("websitePlaceholder")}
                className="w-full px-4 py-3 rounded-lg border text-base"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
              <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>Optional but helps us learn about your business</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Zap size={18} style={{ color: "var(--accent-primary)" }} />
                {t("industry")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {industries.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setIndustry(value)}
                    className="px-4 py-3 rounded-lg text-sm font-medium border transition-all"
                    style={{
                      background: industry === value ? "var(--accent-primary-subtle)" : "var(--surface)",
                      borderColor: industry === value ? "var(--accent-primary)" : "var(--card-border)",
                      color: industry === value ? "var(--accent-primary)" : "var(--text-primary)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={saveStep1} disabled={saving} className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>
              {saving ? t("saving") : <>
                {t("continue")}
                <ChevronRight size={18} />
              </>}
            </button>
          </div>
        )}

        {/* Step 2: Meet your AI agent */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{t("meetReceptionist")}</h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("agentWillAnswerFor", { name: businessName || t("theBusiness") })}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Sparkles size={18} style={{ color: "var(--accent-primary)" }} />
                {t("agentName")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AGENT_NAMES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAgentName(n)}
                    className="py-3 px-4 rounded-lg border transition-all font-medium text-sm"
                    style={{
                      background: agentName === n ? "var(--accent-primary-subtle)" : "var(--surface)",
                      borderColor: agentName === n ? "var(--accent-primary)" : "var(--card-border)",
                      color: agentName === n ? "var(--accent-primary)" : "var(--text-primary)",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Volume2 size={18} style={{ color: "var(--accent-primary)" }} />
                {t("voice")}
              </label>
              <div className="space-y-2">
                {voices.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setVoiceId(v.id)}
                    className="p-4 rounded-lg border cursor-pointer transition-all group"
                    style={{
                      background: voiceId === v.id ? "var(--accent-primary-subtle)" : "var(--surface)",
                      borderColor: voiceId === v.id ? "var(--accent-primary)" : "var(--card-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border-2 transition-colors" style={{
                          borderColor: voiceId === v.id ? "var(--accent-primary)" : "var(--text-tertiary)",
                          background: voiceId === v.id ? "var(--accent-primary)" : "transparent",
                        }} />
                        <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{v.label}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); playVoicePreview(v.id); }}
                        disabled={playingVoice === v.id}
                        className="p-2 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100"
                        style={{ background: "var(--accent-primary-subtle)" }}
                      >
                        <Volume2 size={16} style={{ color: playingVoice === v.id ? "var(--text-muted)" : "var(--accent-primary)" }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <CheckCircle2 size={18} style={{ color: "var(--accent-primary)" }} />
                {t("greetingOptional")}
              </label>
              <textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder={t("greetingPlaceholder", { business: businessName || t("theBusiness"), agent: agentName })}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border text-sm"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button type="button" onClick={() => setStep(1)} className="py-3 px-4 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>{t("back")}</button>
              <button onClick={saveStep2} disabled={saving} className="flex-1 py-3 rounded-lg font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>
                {saving ? t("saving") : <>
                  {t("continue")}
                  <ChevronRight size={18} />
                </>}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Teach your AI */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{t("teachAgentAbout", { name: agentName })}</h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("moreYouShare")}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{t("whatServicesOffer")}</label>
              <textarea
                value={services}
                onChange={(e) => setServices(e.target.value)}
                placeholder={t("servicesPlaceholder")}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border text-sm"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
              <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>Describe what you offer - the more detail, the better</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Clock size={18} style={{ color: "var(--accent-primary)" }} />
                {t("handleEmergenciesAfterHours")}
              </label>
              <div className="space-y-2">
                {(["call_me", "message", "next_day"] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors" style={{
                    background: emergenciesAfterHours === opt ? "var(--accent-primary-subtle)" : "var(--surface)",
                  }}>
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{
                      borderColor: emergenciesAfterHours === opt ? "var(--accent-primary)" : "var(--text-tertiary)",
                    }}>
                      {emergenciesAfterHours === opt && (
                        <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent-primary)" }} />
                      )}
                    </div>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {opt === "call_me" && t("optCallMe")}
                      {opt === "message" && t("optMessage")}
                      {opt === "next_day" && t("optNextDay")}
                    </span>
                    <input type="radio" name="emergencies" checked={emergenciesAfterHours === opt} onChange={() => setEmergenciesAfterHours(opt)} className="hidden" />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Calendar size={18} style={{ color: "var(--accent-primary)" }} />
                {t("howAppointmentsHandled")}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors" style={{
                  background: appointmentHandling === "calendar" ? "var(--accent-primary-subtle)" : "var(--surface)",
                }}>
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{
                    borderColor: appointmentHandling === "calendar" ? "var(--accent-primary)" : "var(--text-tertiary)",
                  }}>
                    {appointmentHandling === "calendar" && (
                      <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent-primary)" }} />
                    )}
                  </div>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("apptCalendar")}</span>
                  <input type="radio" name="appt" checked={appointmentHandling === "calendar"} onChange={() => setAppointmentHandling("calendar")} className="hidden" />
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors" style={{
                  background: appointmentHandling === "capture" ? "var(--accent-primary-subtle)" : "var(--surface)",
                }}>
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{
                    borderColor: appointmentHandling === "capture" ? "var(--accent-primary)" : "var(--text-tertiary)",
                  }}>
                    {appointmentHandling === "capture" && (
                      <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent-primary)" }} />
                    )}
                  </div>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("apptCapture")}</span>
                  <input type="radio" name="appt" checked={appointmentHandling === "capture"} onChange={() => setAppointmentHandling("capture")} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{t("anythingCallersAsk")}</label>
              <textarea
                value={faqExtra}
                onChange={(e) => setFaqExtra(e.target.value)}
                placeholder={t("faqPlaceholder")}
                rows={2}
                className="w-full px-4 py-3 rounded-lg border text-sm"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
              <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>Common questions callers might ask</p>
            </div>

            <div className="flex gap-2 pt-4">
              <button type="button" onClick={() => setStep(2)} className="py-3 px-4 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>{t("back")}</button>
              <button onClick={saveStep3} disabled={saving} className="flex-1 py-3 rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>
                {saving ? t("saving") : <>
                  {t("continue")}
                  <ChevronRight size={18} />
                </>}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Your phone number */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{t("yourBusinessNumber")}</h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Get a dedicated number for your AI agent</p>
            </div>

            {!phoneNumber ? (
              <>
                <div className="p-6 rounded-xl text-center" style={{ background: "var(--accent-primary-subtle)" }}>
                  <Phone size={32} style={{ color: "var(--accent-primary)", margin: "0 auto 12px" }} />
                  <p className="text-sm mb-2" style={{ color: "var(--text-primary)" }}>{t("youllGetNumber")}</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>This usually takes less than a minute</p>
                </div>
                <button onClick={provisionNumber} disabled={provisioning} className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>
                  {provisioning ? <>
                    <Clock size={18} />
                    {t("gettingNumber")}
                  </> : <>
                    <Phone size={18} />
                    {t("getMyNumber")}
                  </>}
                </button>
              </>
            ) : (
              <>
                <div className="p-6 rounded-xl text-center border-2" style={{ borderColor: "var(--accent-primary)", background: "var(--accent-primary-subtle)" }}>
                  <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{t("thisIsRecallTouchNumber")}</p>
                  <p className="text-4xl font-bold" style={{ color: "var(--accent-primary)" }}>{phoneNumber}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{t("chooseHowToUse")}</p>
                  <div className="space-y-2">
                    {[
                      { value: "forward" as const, labelKey: "forwardExisting" as const, subKey: "forwardSub" as const },
                      { value: "main" as const, labelKey: "useAsBusinessNumber" as const, subKey: "useAsSub" as const },
                      { value: "later" as const, labelKey: "setUpLater" as const, subKey: null },
                    ].map(({ value, labelKey, subKey }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setNumberOption(value)}
                        className="w-full text-left p-4 rounded-lg border transition-all"
                        style={{
                          background: numberOption === value ? "var(--accent-primary-subtle)" : "var(--surface)",
                          borderColor: numberOption === value ? "var(--accent-primary)" : "var(--card-border)",
                        }}
                      >
                        <span className="text-sm font-semibold block" style={{ color: "var(--text-primary)" }}>{t(labelKey)}</span>
                        {subKey && <span className="text-xs mt-1 block" style={{ color: "var(--text-secondary)" }}>{t(subKey)}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={() => setStep(3)} className="py-3 px-4 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>{t("back")}</button>
                  <button onClick={() => setStep(5)} className="flex-1 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>
                    {t("continue")}
                    <ChevronRight size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 5: Test your AI */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{t("agentReadyTest")}</h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Time to see your AI in action</p>
            </div>

            {phoneNumber && (
              <div className="p-6 rounded-xl text-center border-2" style={{ borderColor: "var(--accent-primary)", background: "var(--accent-primary-subtle)" }}>
                <Phone size={32} style={{ color: "var(--accent-primary)", margin: "0 auto 12px" }} />
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{t("callThisNumber")}</p>
                <p className="text-4xl font-bold mb-4" style={{ color: "var(--accent-primary)" }}>{phoneNumber}</p>
                <div className="bg-white bg-opacity-50 rounded-lg p-3 mb-4">
                  <p className="text-xs font-medium mb-2" style={{ color: "var(--text-primary)" }}>{t("tryPhrase")}</p>
                  <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>"What services do you offer?"</p>
                </div>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{t("whenYouCallAppear")}</p>
              </div>
            )}

            {!phoneNumber && (
              <div className="p-6 rounded-xl text-center" style={{ background: "var(--bg-elevated)" }}>
                <AlertCircle size={32} style={{ color: "var(--text-secondary)", margin: "0 auto 12px" }} />
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("addNumberLaterInSettings")}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button onClick={finishOnboarding} className="w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>
                <CheckCircle2 size={18} />
                {t("takeMeToDashboard")}
              </button>
              <button type="button" onClick={finishOnboarding} className="w-full py-3 rounded-lg text-sm font-medium border transition-colors" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
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
