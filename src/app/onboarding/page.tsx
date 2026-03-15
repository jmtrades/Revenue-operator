"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

const INDUSTRY_IDS = ["home_services", "healthcare", "legal", "real_estate", "retail", "b2b", "other"] as const;
const AGENT_NAMES = ["Sarah", "Alex", "James", "Emma", "Jordan", "Morgan"];
const CAPABILITY_IDS = ["answer_questions", "book_appointments", "capture_leads", "handle_emergencies", "send_texts", "block_spam"] as const;

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const _router = useRouter();
  const industryOptions = INDUSTRY_IDS.map((id) => ({ id, label: t(`industries.${id}`) }));
  const capabilityOptions = CAPABILITY_IDS.map((id) => ({ id, label: t(`capabilities.${id}`) }));
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  const [yourName, setYourName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("other");

  const [agentName, setAgentName] = useState("Sarah");
  const [greeting, setGreeting] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);

  const [services, setServices] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [hours, setHours] = useState("weekdays_only");
  const [emergencies, setEmergencies] = useState("yes");
  const [appointmentHandling, setAppointmentHandling] = useState("book_direct");
  const [faqExtra, setFaqExtra] = useState("");

  useEffect(() => {
    const wid = sessionStorage.getItem("onboarding_workspace_id");
    const pn = sessionStorage.getItem("onboarding_phone_number");
    if (wid) setWorkspaceId(wid);
    if (pn) setPhoneNumber(pn);
  }, []);

  const submitStep1 = async () => {
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
        body: JSON.stringify({ your_name: yourName.trim(), business_name: businessName.trim(), industry, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setWorkspaceId(data.workspace_id);
      sessionStorage.setItem("onboarding_workspace_id", data.workspace_id);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorSomethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const submitStep2 = async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          agent_name: agentName,
          greeting: greeting.trim() || undefined,
          capabilities,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
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
      const res = await fetch("/api/onboarding/teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          services: services.trim() || undefined,
          website_url: websiteUrl.trim() || undefined,
          hours,
          emergencies_after_hours: emergencies,
          appointment_handling: appointmentHandling,
          faq_extra: faqExtra.trim() || undefined,
        }),
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
      const res = await fetch("/api/onboarding/number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setPhoneNumber(data.phone_number);
      sessionStorage.setItem("onboarding_phone_number", data.phone_number);
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

  const baseClass = "min-h-screen p-6 flex flex-col";
  const inputClass = "w-full px-4 py-2 rounded-lg border text-sm mt-1";
  const labelClass = "block text-xs font-medium uppercase tracking-wide mb-1";
  const cardClass = "rounded-xl border p-6 max-w-lg mx-auto w-full";

  return (
    <main className={baseClass} style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div className="flex-1 flex flex-col justify-center">
        {step === 1 && (
          <div className={cardClass} style={{ borderColor: "var(--border-default)" }}>
            <h1 className="text-xl font-semibold mb-2">{t("step1Heading")}</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              {t("step1Subtitle")}
            </p>
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
              <div>
                <span className={labelClass} style={{ color: "var(--text-muted)" }}>{t("businessTypeLabel")}</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {industryOptions.map((ind: { id: string; label: string }) => (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => setIndustry(ind.id)}
                      className="px-3 py-1.5 rounded-lg text-sm border"
                      style={{
                        borderColor: industry === ind.id ? "var(--accent-primary)" : "var(--border-default)",
                        background: industry === ind.id ? "var(--accent-primary-subtle)" : "var(--bg-inset)",
                      }}
                    >
                      {ind.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="text-sm mt-4" style={{ color: "var(--meaning-red)" }}>{error}</p>}
            <button type="button" onClick={submitStep1} disabled={loading} className="mt-6 w-full py-3 rounded-lg font-medium" style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}>
              {loading ? t("creating") : t("continue") + " →"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={cardClass} style={{ borderColor: "var(--border-default)" }}>
            <h1 className="text-xl font-semibold mb-2">{t("step2Heading")}</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{t("step2Subtitle")}</p>
            <div className="space-y-4">
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>{t("agentNameLabel")}</label>
                <select value={agentName} onChange={(e) => setAgentName(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }}>
                  {AGENT_NAMES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>{t("greetingLabelOptional")}</label>
                <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={2} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder={t("greetingPlaceholderDynamic", { business: businessName || "us", agent: agentName })} disabled={loading} />
              </div>
              <div>
                <span className={labelClass} style={{ color: "var(--text-muted)" }}>{t("yourAgentCan")}</span>
                <ul className="mt-2 space-y-2">
                  {capabilityOptions.map((cap) => (
                    <li key={cap.id}>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={capabilities.includes(cap.id)} onChange={() => toggleCapability(cap.id)} />
                        <span className="text-sm">{cap.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {error && <p className="text-sm mt-4" style={{ color: "var(--meaning-red)" }}>{error}</p>}
            <button type="button" onClick={submitStep2} disabled={loading} className="mt-6 w-full py-3 rounded-lg font-medium" style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}>
              {loading ? t("saving") : t("continue")}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className={cardClass} style={{ borderColor: "var(--border-default)" }}>
            <h1 className="text-xl font-semibold mb-2">{t("step3Heading")}</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{t("step3Subtitle")}</p>
            <div className="space-y-4">
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>{t("servicesLabel")}</label>
                <textarea value={services} onChange={(e) => setServices(e.target.value)} rows={3} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder={t("servicesPlaceholder")} disabled={loading} />
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>{t("websiteHintShort")}</p>
                <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className={inputClass + " mt-1"} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder="https://..." disabled={loading} />
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>{t("hoursLabelShort")}</label>
                <select value={hours} onChange={(e) => setHours(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }}>
                  <option value="weekdays_only">{t("hoursWeekdays")}</option>
                  <option value="weekdays_sat">{t("hoursWeekdaysSat")}</option>
                  <option value="seven_days">{t("hoursSevenDays")}</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>{t("emergenciesLabel")}</label>
                <select value={emergencies} onChange={(e) => setEmergencies(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }}>
                  <option value="yes">{t("emergenciesYes")}</option>
                  <option value="no">{t("emergenciesNo")}</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>{t("appointmentLabel")}</label>
                <select value={appointmentHandling} onChange={(e) => setAppointmentHandling(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }}>
                  <option value="book_direct">{t("appointmentDirect")}</option>
                  <option value="capture">{t("appointmentCapture")}</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>{t("faqExtraLabel")}</label>
                <textarea value={faqExtra} onChange={(e) => setFaqExtra(e.target.value)} rows={2} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder={t("faqExtraPlaceholder")} disabled={loading} />
              </div>
            </div>
            {error && <p className="text-sm mt-4" style={{ color: "var(--meaning-red)" }}>{error}</p>}
            <button type="button" onClick={submitStep3} disabled={loading} className="mt-6 w-full py-3 rounded-lg font-medium" style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}>
              {loading ? t("saving") : t("continue")}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className={cardClass} style={{ borderColor: "var(--border-default)" }}>
            <h1 className="text-xl font-semibold mb-2">{t("step4Heading")}</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{t("step4Subtitle")}</p>
            <ul className="space-y-2 text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              <li><strong>{t("option1")}</strong></li>
              <li><strong>{t("option2")}</strong></li>
              <li><strong>{t("option3")}</strong></li>
            </ul>
            {error && <p className="text-sm mb-4" style={{ color: "var(--meaning-red)" }}>{error}</p>}
            <button type="button" onClick={submitStep4} disabled={loading} className="w-full py-3 rounded-lg font-medium" style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}>
              {loading ? t("gettingNumber") : t("getMyNumber")}
            </button>
          </div>
        )}

        {step === 5 && (
          <div className={cardClass} style={{ borderColor: "var(--border-default)" }}>
            <h1 className="text-xl font-semibold mb-2">{t("step5Heading")}</h1>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>{t("step5Subtitle")}</p>
            <p className="text-2xl font-mono mb-6" style={{ color: "var(--accent-primary)" }}>{phoneNumber || "—"}</p>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{t("tryAsking")}</p>
            <div className="flex flex-col gap-3">
              <Link href={workspaceId ? `/connect?workspace_id=${encodeURIComponent(workspaceId)}` : "/connect"} className="w-full py-3 rounded-lg font-medium text-center" style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}>
                {t("takeMeToDashboard")}
              </Link>
              <Link href={workspaceId ? `/dashboard?workspace_id=${encodeURIComponent(workspaceId)}` : "/dashboard"} className="w-full py-3 rounded-lg font-medium text-center border" style={{ borderColor: "var(--border-default)" }}>
                {t("testLater")}
              </Link>
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
