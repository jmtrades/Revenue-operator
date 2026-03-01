"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const INDUSTRIES = [
  { id: "home_services", label: "Home Services" },
  { id: "healthcare", label: "Healthcare" },
  { id: "legal", label: "Legal" },
  { id: "real_estate", label: "Real Estate" },
  { id: "retail", label: "Retail / Service" },
  { id: "b2b", label: "B2B / Sales" },
  { id: "other", label: "Other" },
];

const AGENT_NAMES = ["Sarah", "Alex", "James", "Emma", "Jordan", "Morgan"];

const CAPABILITIES = [
  { id: "answer_questions", label: "Answer questions about your services" },
  { id: "book_appointments", label: "Book appointments" },
  { id: "capture_leads", label: "Capture leads and send you alerts" },
  { id: "handle_emergencies", label: "Handle emergencies (alert you immediately)" },
  { id: "send_texts", label: "Send confirmation texts to callers" },
  { id: "block_spam", label: "Block spam calls" },
];

export default function OnboardingPage() {
  const router = useRouter();
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
      setError("Your name and business name are required.");
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
      setError(e instanceof Error ? e.message : "Something went wrong");
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
      setError(e instanceof Error ? e.message : "Something went wrong");
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
      setError(e instanceof Error ? e.message : "Something went wrong");
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
      setError(e instanceof Error ? e.message : "Something went wrong");
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
            <h1 className="text-xl font-semibold mb-2">Let&apos;s set up your AI phone team.</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              This takes about 5 minutes.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="your_name" className={labelClass} style={{ color: "var(--text-muted)" }}>Your name</label>
                <input id="your_name" type="text" value={yourName} onChange={(e) => setYourName(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder="Jane" disabled={loading} />
              </div>
              <div>
                <label htmlFor="business_name" className={labelClass} style={{ color: "var(--text-muted)" }}>Business name</label>
                <input id="business_name" type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder="Acme Plumbing" disabled={loading} />
              </div>
              <div>
                <label htmlFor="phone" className={labelClass} style={{ color: "var(--text-muted)" }}>Your phone number</label>
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder="(555) 123-4567" disabled={loading} />
              </div>
              <div>
                <span className={labelClass} style={{ color: "var(--text-muted)" }}>What type of business?</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {INDUSTRIES.map((ind) => (
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
              {loading ? "Creating…" : "Continue →"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={cardClass} style={{ borderColor: "var(--border-default)" }}>
            <h1 className="text-xl font-semibold mb-2">Meet your AI receptionist.</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Choose a name and what they can do.</p>
            <div className="space-y-4">
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>Agent name</label>
                <select value={agentName} onChange={(e) => setAgentName(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }}>
                  {AGENT_NAMES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>Greeting (optional)</label>
                <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={2} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder={`Thanks for calling ${businessName || "us"}! This is ${agentName}. How can I help?`} disabled={loading} />
              </div>
              <div>
                <span className={labelClass} style={{ color: "var(--text-muted)" }}>Your agent can</span>
                <ul className="mt-2 space-y-2">
                  {CAPABILITIES.map((cap) => (
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
              {loading ? "Saving…" : "Continue →"}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className={cardClass} style={{ borderColor: "var(--border-default)" }}>
            <h1 className="text-xl font-semibold mb-2">Quick — tell your AI about your business.</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>What services, hours, and common questions?</p>
            <div className="space-y-4">
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>What services do you offer?</label>
                <textarea value={services} onChange={(e) => setServices(e.target.value)} rows={3} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder="e.g. Drain cleaning, water heater repair, leak detection…" disabled={loading} />
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Or paste your website URL and we&apos;ll figure it out.</p>
                <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className={inputClass + " mt-1"} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder="https://..." disabled={loading} />
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>What are your hours?</label>
                <select value={hours} onChange={(e) => setHours(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }}>
                  <option value="weekdays_only">Mon–Fri 9am–5pm</option>
                  <option value="weekdays_sat">Mon–Fri 9am–5pm, Sat 9am–2pm</option>
                  <option value="seven_days">Seven days a week</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>Do you handle emergencies after hours?</label>
                <select value={emergencies} onChange={(e) => setEmergencies(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }}>
                  <option value="yes">Yes — call me immediately</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>How should we handle appointments?</label>
                <select value={appointmentHandling} onChange={(e) => setAppointmentHandling(e.target.value)} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }}>
                  <option value="book_direct">Book directly into my calendar</option>
                  <option value="capture">Capture details and I&apos;ll confirm later</option>
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--text-muted)" }}>Anything callers always ask about? (optional)</label>
                <textarea value={faqExtra} onChange={(e) => setFaqExtra(e.target.value)} rows={2} className={inputClass} style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)" }} placeholder="e.g. We serve the greater Portland area. Service call starts at $89." disabled={loading} />
              </div>
            </div>
            {error && <p className="text-sm mt-4" style={{ color: "var(--meaning-red)" }}>{error}</p>}
            <button type="button" onClick={submitStep3} disabled={loading} className="mt-6 w-full py-3 rounded-lg font-medium" style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}>
              {loading ? "Saving…" : "Continue →"}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className={cardClass} style={{ borderColor: "var(--border-default)" }}>
            <h1 className="text-xl font-semibold mb-2">Your AI phone number is ready.</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>We&apos;re provisioning a number. How to use it:</p>
            <ul className="space-y-2 text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              <li><strong>Option 1:</strong> Forward your existing number to this one.</li>
              <li><strong>Option 2:</strong> Use this as your new business number on website and ads.</li>
              <li><strong>Option 3:</strong> Set up later — just test it first.</li>
            </ul>
            {error && <p className="text-sm mb-4" style={{ color: "var(--meaning-red)" }}>{error}</p>}
            <button type="button" onClick={submitStep4} disabled={loading} className="w-full py-3 rounded-lg font-medium" style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}>
              {loading ? "Getting number…" : "Get my number →"}
            </button>
          </div>
        )}

        {step === 5 && (
          <div className={cardClass} style={{ borderColor: "var(--border-default)" }}>
            <h1 className="text-xl font-semibold mb-2">Your AI is live. Let&apos;s test it!</h1>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Call this number from your phone right now:</p>
            <p className="text-2xl font-mono mb-6" style={{ color: "var(--accent-primary)" }}>{phoneNumber || "—"}</p>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Try asking: &quot;What services do you offer?&quot; or &quot;I need to schedule an appointment.&quot;</p>
            <div className="flex flex-col gap-3">
              <Link href={workspaceId ? `/connect?workspace_id=${encodeURIComponent(workspaceId)}` : "/connect"} className="w-full py-3 rounded-lg font-medium text-center" style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}>
                I just called — take me to my dashboard →
              </Link>
              <Link href={workspaceId ? `/dashboard?workspace_id=${encodeURIComponent(workspaceId)}` : "/dashboard"} className="w-full py-3 rounded-lg font-medium text-center border" style={{ borderColor: "var(--border-default)" }}>
                I&apos;ll test later — take me to my dashboard →
              </Link>
            </div>
          </div>
        )}
      </div>
      <p className="text-center text-xs py-4" style={{ color: "var(--text-tertiary)" }}>
        <Link href="/" className="underline">Back to home</Link>
      </p>
    </main>
  );
}
