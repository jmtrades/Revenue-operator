"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";

const STEPS = 5;
const INDUSTRIES = [
  { value: "home_services", label: "Home Services" },
  { value: "healthcare", label: "Healthcare" },
  { value: "legal", label: "Legal" },
  { value: "real_estate", label: "Real Estate" },
  { value: "insurance", label: "Insurance" },
  { value: "b2b_sales", label: "B2B Sales" },
  { value: "local_business", label: "Local Business" },
  { value: "contractors", label: "Contractors" },
];
const AGENT_NAMES = ["Sarah", "Alex", "Emma", "James", "Mike", "Lisa"];
const VOICES = [
  { id: "warm", label: "Warm & friendly" },
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "calm", label: "Calm" },
];

function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId, workspaces, loadWorkspaces } = useWorkspace();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");

  // Step 2
  const [agentName, setAgentName] = useState("Sarah");
  const [voiceId, setVoiceId] = useState("warm");
  const [greeting, setGreeting] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>(["answer_questions", "capture_leads", "book_appointments", "handle_emergencies", "send_texts", "block_spam"]);

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
          business_name: businessName || "My Business",
          offer_summary: industry ? `${industry.replace(/_/g, " ")} services` : "",
        }),
      });
      if (!ctxRes.ok) throw new Error("Failed to save");
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }, [wid, businessName, industry]);

  const saveStep2 = useCallback(async () => {
    if (!wid) return;
    setSaving(true);
    setError(null);
    try {
      const greetingText = greeting.trim() || `Thanks for calling ${businessName || "the business"}! This is ${agentName}. How can I help you today?`;
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
        throw new Error((data as { error?: string }).error || "Failed to save agent");
      }
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }, [wid, agentName, voiceId, greeting, capabilities, businessName]);

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
      if (!res.ok) throw new Error("Failed to save");
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
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
      const data = await res.json();
      if (data.phone_number) setPhoneNumber(data.phone_number);
      else if (data.error) setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setProvisioning(false);
    }
  }, [wid]);

  const finishOnboarding = useCallback(async () => {
    if (!wid) return;
    try {
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
          <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Get started</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Create an account first. Your phone system will be ready in minutes.</p>
          <Link href="/activate" className="inline-block py-2.5 px-4 rounded-lg font-medium text-sm" style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}>Start free</Link>
        </div>
      </div>
    );
  }

  const progress = (step / STEPS) * 100;

  return (
    <div className="min-h-screen flex flex-col p-6 md:p-12" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <div className="max-w-lg mx-auto w-full">
        <div className="mb-8">
          <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "var(--bg-elevated)" }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: "var(--accent-primary)" }} />
          </div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Step {step} of {STEPS}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "var(--meaning-red)", color: "#fff" }}>{error}</div>
        )}

        {/* Step 1: Your business */}
        {step === 1 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Tell us about your business</h1>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Business name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Acme Plumbing"
                className="w-full px-4 py-3 rounded-lg border"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Website (optional)</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="acmeplumbing.com"
                className="w-full px-4 py-3 rounded-lg border"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <span className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Industry</span>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map(({ value, label }) => (
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
              {saving ? "Saving…" : "Continue →"}
            </button>
          </div>
        )}

        {/* Step 2: Meet your AI agent */}
        {step === 2 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Meet your receptionist</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Your agent will answer calls, capture leads, and book appointments for {businessName || "your business"}.</p>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Agent name</label>
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
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Voice</label>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Greeting (optional)</label>
              <textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder={`Thanks for calling ${businessName || "the business"}! This is ${agentName}. How can I help you today?`}
                rows={2}
                className="w-full px-4 py-3 rounded-lg border text-sm"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setStep(1)} className="py-2.5 px-4 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>← Back</button>
              <button onClick={saveStep2} disabled={saving} className="flex-1 py-3 rounded-lg font-medium text-sm disabled:opacity-50" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>{saving ? "Saving…" : "Continue →"}</button>
            </div>
          </div>
        )}

        {/* Step 3: Teach your AI */}
        {step === 3 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Teach {agentName} about your business</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>The more you share, the smarter your agent gets.</p>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>What services do you offer?</label>
              <textarea
                value={services}
                onChange={(e) => setServices(e.target.value)}
                placeholder="Drain cleaning, water heater repair, leak detection, pipe repair..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border text-sm"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <span className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Do you handle emergencies after hours?</span>
              <div className="space-y-2">
                {(["call_me", "message", "next_day"] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="emergencies" checked={emergenciesAfterHours === opt} onChange={() => setEmergenciesAfterHours(opt)} className="rounded-full" />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                      {opt === "call_me" && "Yes — call me back soon"}
                      {opt === "message" && "Yes — take a message and I'll call back"}
                      {opt === "next_day" && "No — take a message for next business day"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>How should appointments be handled?</span>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="appt" checked={appointmentHandling === "calendar"} onChange={() => setAppointmentHandling("calendar")} className="rounded-full" />
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>Book directly into my calendar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="appt" checked={appointmentHandling === "capture"} onChange={() => setAppointmentHandling("capture")} className="rounded-full" />
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>Capture details and I'll confirm later</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Anything callers always ask? (optional)</label>
              <textarea
                value={faqExtra}
                onChange={(e) => setFaqExtra(e.target.value)}
                placeholder="Service call starts at $89. Serves the greater Portland area. Free estimates on remodels."
                rows={2}
                className="w-full px-4 py-3 rounded-lg border text-sm"
                style={{ background: "var(--surface)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setStep(2)} className="py-2.5 px-4 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>← Back</button>
              <button onClick={saveStep3} disabled={saving} className="flex-1 py-3 rounded-lg font-medium text-sm disabled:opacity-50" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>{saving ? "Saving…" : "Continue →"}</button>
            </div>
          </div>
        )}

        {/* Step 4: Your phone number */}
        {step === 4 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Your business number</h1>
            {!phoneNumber ? (
              <>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>You&apos;ll get a number for your agent to answer. You can forward your existing number or use this as your main business line.</p>
                <button onClick={provisionNumber} disabled={provisioning} className="w-full py-3 rounded-lg font-medium text-sm disabled:opacity-50" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>
                  {provisioning ? "Getting your number…" : "Get my number"}
                </button>
              </>
            ) : (
              <>
                <div className="p-4 rounded-xl text-center" style={{ background: "var(--bg-elevated)" }}>
                  <p className="text-2xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{phoneNumber}</p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>This is your Recall Touch number</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Choose how to use it:</p>
                  {[
                    { value: "forward" as const, label: "Forward my existing number", sub: "Calls forward when you can't answer." },
                    { value: "main" as const, label: "Use this as my business number", sub: "Put it on your website, cards, and ads. Every call is answered first." },
                    { value: "later" as const, label: "I'll set this up later", sub: "" },
                  ].map(({ value, label, sub }) => (
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
                      <span className="text-sm font-medium block">{label}</span>
                      {sub && <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{sub}</span>}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setStep(3)} className="py-2.5 px-4 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>← Back</button>
                  <button onClick={() => setStep(5)} className="flex-1 py-3 rounded-lg font-medium text-sm" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>Continue →</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 5: Test your AI */}
        {step === 5 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Your agent is ready. Let&apos;s test it.</h1>
            {phoneNumber && (
              <div className="p-6 rounded-xl text-center" style={{ background: "var(--bg-elevated)" }}>
                <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>Call this number from your phone:</p>
                <p className="text-2xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>{phoneNumber}</p>
                <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>Try: &ldquo;I need a plumber for a leaky faucet&rdquo; or &ldquo;What are your hours?&rdquo;</p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>When you call, you&apos;ll see it appear in your activity feed.</p>
              </div>
            )}
            {!phoneNumber && (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>You can add a phone number later in Settings. Your agent is set up and ready.</p>
            )}
            <div className="flex flex-col gap-2">
              <button onClick={finishOnboarding} className="w-full py-3 rounded-lg font-medium text-sm" style={{ background: "var(--meaning-green)", color: "#0c0f13" }}>
                Take me to my dashboard →
              </button>
              <button type="button" onClick={finishOnboarding} className="w-full py-2.5 rounded-lg text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>
                Skip — I&apos;ll test later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Preparing…</p>
        </div>
      }
    >
      <OnboardingWizard />
    </Suspense>
  );
}
