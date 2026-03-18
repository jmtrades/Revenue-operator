"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Wrench, Stethoscope, Scale, Sparkles, Droplets, Home, Building, GraduationCap, MoreHorizontal,
  ArrowRight, ArrowLeft, Check, Phone, User, Brain, Settings,
} from "lucide-react";

const INDUSTRY_OPTIONS = [
  { id: "home_services", label: "HVAC & Mechanical", icon: Wrench, color: "bg-zinc-900" },
  { id: "healthcare", label: "Dental & Orthodontics", icon: Stethoscope, color: "bg-emerald-500" },
  { id: "legal", label: "Legal & Consulting", icon: Scale, color: "bg-zinc-900" },
  { id: "beauty", label: "Med Spa & Beauty", icon: Sparkles, color: "bg-pink-500" },
  { id: "plumbing", label: "Plumbing & Electrical", icon: Droplets, color: "bg-cyan-500" },
  { id: "real_estate", label: "Real Estate & Agencies", icon: Home, color: "bg-orange-500" },
  { id: "roofing", label: "Roofing & Contracting", icon: Building, color: "bg-amber-500" },
  { id: "coaching", label: "Coaching & Training", icon: GraduationCap, color: "bg-zinc-900" },
  { id: "other", label: "Other / Not Listed", icon: MoreHorizontal, color: "bg-zinc-500" },
] as const;

const AGENT_NAMES = ["Sarah", "Alex", "James", "Emma", "Jordan", "Morgan"];
const CAPABILITY_IDS = ["answer_questions", "book_appointments", "capture_leads", "handle_emergencies", "send_texts", "block_spam"] as const;

const STEPS = [
  { num: 1, label: "Industry", icon: Building },
  { num: 2, label: "Business", icon: User },
  { num: 3, label: "AI Agent", icon: Brain },
  { num: 4, label: "Configure", icon: Settings },
  { num: 5, label: "Go Live", icon: Phone },
];

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="w-full max-w-lg mx-auto mb-8">
      <div className="flex items-center justify-between mb-3">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const isDone = step > s.num;
          const isCurrent = step === s.num;
          return (
            <div key={s.num} className="flex flex-col items-center gap-1">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
                style={{
                  background: isDone ? "var(--accent-primary)" : isCurrent ? "var(--accent-primary)" : "rgba(255,255,255,0.05)",
                  color: isDone || isCurrent ? "#000" : "var(--text-tertiary)",
                  border: isCurrent ? "2px solid var(--accent-primary)" : isDone ? "none" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className="text-[10px] hidden sm:block" style={{ color: isCurrent ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ background: "var(--accent-primary)", width: `${((step - 1) / (total - 1)) * 100}%` }}
        />
      </div>
      <p className="text-xs text-center mt-2" style={{ color: "var(--text-tertiary)" }}>
        Step {step} of {total}
      </p>
    </div>
  );
}

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const capabilityOptions = CAPABILITY_IDS.map((id) => ({ id, label: t(`capabilities.${id}`) }));
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  // Step 1: Industry
  const [industry, setIndustry] = useState<string | null>(null);

  // Step 2: Business info
  const [yourName, setYourName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");

  // Step 3: Agent
  const [agentName, setAgentName] = useState("Sarah");
  const [greeting, setGreeting] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>(["answer_questions", "book_appointments", "capture_leads"]);

  // Step 4: Configure
  const [services, setServices] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [hours, setHours] = useState("weekdays_only");
  const [emergencies, setEmergencies] = useState("yes");
  const [appointmentHandling, setAppointmentHandling] = useState("book_direct");

  useEffect(() => {
    const wid = sessionStorage.getItem("onboarding_workspace_id");
    const pn = sessionStorage.getItem("onboarding_phone_number");
    if (wid) setWorkspaceId(wid);
    if (pn) setPhoneNumber(pn);
  }, []);

  const submitStep2 = async () => {
    if (!yourName.trim() || !businessName.trim()) {
      setError(t("errorNameRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ your_name: yourName.trim(), business_name: businessName.trim(), industry: industry || "other", phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setWorkspaceId(data.workspace_id);
      sessionStorage.setItem("onboarding_workspace_id", data.workspace_id);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorSomethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const submitStep3 = async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, agent_name: agentName, greeting: greeting.trim() || undefined, capabilities }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorSomethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const submitStep4 = async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, services: services.trim() || undefined, website_url: websiteUrl.trim() || undefined, hours, emergencies_after_hours: emergencies, appointment_handling: appointmentHandling }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      // Auto-provision number
      const numRes = await fetch("/api/onboarding/number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      const numData = await numRes.json();
      if (numRes.ok && numData.phone_number) {
        setPhoneNumber(numData.phone_number);
        sessionStorage.setItem("onboarding_phone_number", numData.phone_number);
      }
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorSomethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const toggleCapability = (id: string) => {
    setCapabilities((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const inputClass = "w-full px-4 py-2.5 rounded-lg border text-sm";
  const labelClass = "block text-xs font-medium uppercase tracking-wide mb-1.5";
  const cardClass = "rounded-2xl border p-6 md:p-8 max-w-lg mx-auto w-full";

  return (
    <main className="min-h-screen p-6 flex flex-col" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div className="flex-1 flex flex-col justify-center">
        <ProgressBar step={step} total={5} />

        {/* Step 1: Industry Selection */}
        {step === 1 && (
          <div className={cardClass} style={{ borderColor: "var(--border-default)" }}>
            <h1 className="text-2xl font-bold mb-2">What&apos;s your business?</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              We&apos;ll customize your AI greeting and follow-up templates.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {INDUSTRY_OPTIONS.map((ind) => {
                const Icon = ind.icon;
                const selected = industry === ind.id;
                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => setIndustry(ind.id)}
                    className="p-4 rounded-xl border text-left transition-all flex flex-col items-center text-center gap-2 hover:scale-[1.02]"
                    style={{
                      borderColor: selected ? "var(--accent-primary)" : "var(--border-default)",
                      background: selected ? "rgba(34,197,94,0.08)" : "var(--bg-surface)",
                      boxShadow: selected ? "0 0 0 1px var(--accent-primary)" : "none",
                    }}
                  >
                    <div className={`w-10 h-10 rounded-lg ${ind.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {ind.label}
                    </span>
                    {selected && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => industry && setStep(2)}
              disabled={!industry}
              className="mt-6 w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{ background: "var(--accent-primary)", color: "#000" }}
            >
              Next: Your Business <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Business Info */}
        {step === 2 && (
          <div className={cardClass} style={{ borderColor: "var(--border-default)" }}>
            <h1 className="text-2xl font-bold mb-2">{t("step1Heading")}</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{t("step1Subtitle")}</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="your_name" className={labelClass} style={{ color: "var(--text-muted)" }}>{t("yourNameLabel")}</label>
                <input id="your_name" type="text" value={yourName} onChange={(e) => setYourName(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder={t("yourNamePlaceholder")} disabled={loading} />
              </div>
              <div>
                <label htmlFor="business_name" className={labelClass} style={{ color: "var(--text-muted)" }}>{t("businessNameLabel")}</label>
                <input id="business_name" type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder={t("businessNamePlaceholderShort")} disabled={loading} />
              </div>
              <div>
                <label htmlFor="phone" className={labelClass} style={{ color: "var(--text-muted)" }}>{t("phoneLabel")}</label>
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder={t("phonePlaceholderShort")} disabled={loading} />
              </div>
            </div>
            {error && <p className="text-sm mt-4 text-red-400">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(1)} className="px-4 py-3 rounded-xl border font-medium flex items-center gap-1" style={{ borderColor: "var(--border-default)" }}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button type="button" onClick={submitStep2} disabled={loading || !yourName.trim() || !businessName.trim()} className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: "var(--accent-primary)", color: "#000" }}>
                {loading ? "Creating..." : "Next: Your AI Agent"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: AI Agent Config */}
        {step === 3 && (
          <div className={cardClass} style={{ borderColor: "var(--border-default)" }}>
            <h1 className="text-2xl font-bold mb-2">Your AI&apos;s First Words</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              This is what your customers hear when they call. You can edit anytime.
            </p>
            <div className="space-y-4">
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>{t("agentNameLabel")}</label>
                <div className="flex flex-wrap gap-2">
                  {AGENT_NAMES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAgentName(n)}
                      className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                      style={{
                        borderColor: agentName === n ? "var(--accent-primary)" : "var(--border-default)",
                        background: agentName === n ? "rgba(34,197,94,0.08)" : "var(--bg-inset)",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>Greeting (optional)</label>
                <textarea
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  rows={3}
                  className={inputClass}
                  style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }}
                  placeholder={`"Hi, thanks for calling ${businessName || "us"}! This is ${agentName}, your AI assistant. How can I help you today?"`}
                  disabled={loading}
                />
              </div>
              <div>
                <span className={labelClass} style={{ color: "var(--text-muted)" }}>Your agent can:</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {capabilityOptions.map((cap) => {
                    const selected = capabilities.includes(cap.id);
                    return (
                      <button
                        key={cap.id}
                        type="button"
                        onClick={() => toggleCapability(cap.id)}
                        className="px-3 py-2 rounded-lg text-sm border text-left flex items-center gap-2 transition-all"
                        style={{
                          borderColor: selected ? "var(--accent-primary)" : "var(--border-default)",
                          background: selected ? "rgba(34,197,94,0.08)" : "var(--bg-inset)",
                        }}
                      >
                        {selected ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded border border-white/20 shrink-0" />}
                        {cap.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {error && <p className="text-sm mt-4 text-red-400">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(2)} className="px-4 py-3 rounded-xl border font-medium flex items-center gap-1" style={{ borderColor: "var(--border-default)" }}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button type="button" onClick={submitStep3} disabled={loading} className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: "var(--accent-primary)", color: "#000" }}>
                {loading ? "Saving..." : "Next: Configure"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Configure */}
        {step === 4 && (
          <div className={cardClass} style={{ borderColor: "var(--border-default)" }}>
            <h1 className="text-2xl font-bold mb-2">Teach Your AI</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              Tell us about your services so the AI can answer questions accurately.
            </p>
            <div className="space-y-4">
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>{t("servicesLabel")}</label>
                <textarea value={services} onChange={(e) => setServices(e.target.value)} rows={3} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder={t("servicesPlaceholder")} disabled={loading} />
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>Website (optional)</label>
                <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder="https://your-business.com" disabled={loading} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} style={{ color: "var(--text-muted)" }}>Business Hours</label>
                  <select value={hours} onChange={(e) => setHours(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }}>
                    <option value="weekdays_only">Weekdays only</option>
                    <option value="weekdays_sat">Weekdays + Saturday</option>
                    <option value="seven_days">7 days a week</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={{ color: "var(--text-muted)" }}>Appointments</label>
                  <select value={appointmentHandling} onChange={(e) => setAppointmentHandling(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }}>
                    <option value="book_direct">Book directly</option>
                    <option value="capture">Capture info only</option>
                  </select>
                </div>
              </div>
            </div>
            {error && <p className="text-sm mt-4 text-red-400">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(3)} className="px-4 py-3 rounded-xl border font-medium flex items-center gap-1" style={{ borderColor: "var(--border-default)" }}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button type="button" onClick={submitStep4} disabled={loading} className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: "var(--accent-primary)", color: "#000" }}>
                {loading ? "Setting up..." : "Go Live!"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div className={cardClass} style={{ borderColor: "var(--accent-primary)", boxShadow: "0 0 40px rgba(34,197,94,0.1)" }}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-black" />
              </div>
              <h1 className="text-2xl font-bold mb-2">You&apos;re Live!</h1>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                Your AI agent is ready to answer calls. Here&apos;s your number:
              </p>
              <p className="text-3xl font-mono font-bold mb-2" style={{ color: "var(--accent-primary)" }}>
                {phoneNumber || "Provisioning..."}
              </p>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                Forward your business line to this number, then try calling it!
              </p>

              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 mb-6">
                <p className="text-xs text-emerald-400 font-medium">Quick Test</p>
                <p className="text-sm text-white/70 mt-1">
                  Call {phoneNumber || "your new number"} and ask about your services. The AI will respond using the info you just provided.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href={workspaceId ? `/dashboard?workspace_id=${encodeURIComponent(workspaceId)}` : "/dashboard"}
                  className="w-full py-3 rounded-xl font-semibold text-center flex items-center justify-center gap-2 no-underline"
                  style={{ background: "var(--accent-primary)", color: "#000" }}
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={workspaceId ? `/dashboard/calls?workspace_id=${encodeURIComponent(workspaceId)}` : "/dashboard/calls"}
                  className="w-full py-3 rounded-xl font-medium text-center border no-underline"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                >
                  View Call History
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs py-4" style={{ color: "var(--text-tertiary)" }}>
        <Link href="/" className="underline">{t("backToHome")}</Link>
      </p>
    </main>
  );
}
