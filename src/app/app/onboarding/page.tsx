"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  { id: "warm_female", label: "Warm Female" },
  { id: "professional_male", label: "Professional Male" },
  { id: "friendly_female", label: "Friendly Female" },
  { id: "calm_male", label: "Calm Male" },
  { id: "energetic_female", label: "Energetic Female" },
  { id: "confident_male", label: "Confident Male" },
];

function getSignupPrefill(): { businessName?: string; industry?: string; website?: string } {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("rt_signup") ?? localStorage.getItem("recalltouch_signup");
    if (raw) {
      const d = JSON.parse(raw) as { businessName?: string; businessType?: string; industry?: string; website?: string };
      return {
        businessName: d?.businessName?.trim(),
        industry: d?.industry ?? d?.businessType ?? "",
        website: d?.website?.trim(),
      };
    }
  } catch {
    // ignore
  }
  return {};
}

export default function AppOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("");

  const [agentName, setAgentName] = useState("Sarah");
  const [voiceId, setVoiceId] = useState("warm_female");
  const [greeting, setGreeting] = useState("");
  const [personality, setPersonality] = useState(50);

  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState("");
  const [_hours, _setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({});
  const [afterHours, setAfterHours] = useState<"messages" | "emergency" | "forward">("messages");
  const [faqRows, setFaqRows] = useState<string[]>(["", "", ""]);

  const [phoneDisplay] = useState("555-XXX-XXXX");
  const [_numberOption, _setNumberOption] = useState<"forward" | "new" | "skip">("new");

  const [testComplete, setTestComplete] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const id = setTimeout(() => {
      const prefill = getSignupPrefill();
      setBusinessName(prefill.businessName ?? "");
      setIndustry(prefill.industry ?? "");
      setWebsite(prefill.website ?? "");
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(tz);
      } catch {
        setTimezone("America/Los_Angeles");
      }
    }, 0);
    return () => clearTimeout(id);
  }, [mounted]);

  const defaultGreeting = `Thanks for calling ${businessName || "[Business]"}! This is ${agentName}. How can I help you today?`;

  const addService = () => {
    const t = serviceInput.trim();
    if (t && !services.includes(t)) {
      setServices((s) => [...s, t]);
      setServiceInput("");
    }
  };

  const finishOnboarding = () => {
    try {
      localStorage.setItem("rt_onboarded", "true");
    } catch {
      // ignore
    }
    router.push("/app/activity");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-16 w-64 bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col p-6 md:p-12">
      <div className="max-w-lg mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            {Array.from({ length: STEPS }, (_, i) => (
              <span
                key={i}
                className={`inline-block w-2.5 h-2.5 rounded-full ${i + 1 <= step ? "bg-white" : "bg-zinc-700"}`}
                aria-hidden
              />
            ))}
          </div>
          <p className="text-xs text-center text-zinc-500">Step {step} of {STEPS}</p>
        </div>

        {/* Step 1 — YOUR BUSINESS */}
        {step === 1 && (
          <div className="space-y-6">
            <p className="text-sm text-zinc-400">
              Welcome! Let&apos;s set up your AI phone system. This takes about 2 minutes.
            </p>
            <h1 className="text-xl font-semibold">Your business</h1>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Business name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Acme Plumbing"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Industry</label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setIndustry(value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                      industry === value ? "bg-white/10 border-white text-white" : "bg-zinc-800/50 border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Website (optional)</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourbusiness.com"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
              />
              <p className="mt-1 text-xs text-zinc-500">We&apos;ll auto-learn your services and FAQ from your site.</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Address (optional)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
              />
              <p className="mt-1 text-xs text-zinc-500">Used for location-based call routing.</p>
            </div>
            <div>
              <span className="block text-xs font-medium mb-1.5 text-zinc-400">Timezone</span>
              <p className="text-sm text-zinc-500">{timezone || "Detecting…"}</p>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — MEET YOUR AI */}
        {step === 2 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold">Meet your AI</h1>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Agent name</label>
              <select
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:border-zinc-500 focus:outline-none"
              >
                {AGENT_NAMES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 text-zinc-400">Voice</label>
              <div className="grid grid-cols-2 gap-2">
                {VOICES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVoiceId(v.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm ${
                      voiceId === v.id ? "border-zinc-400 bg-zinc-800/80 text-white" : "border-zinc-700 bg-zinc-800/50 text-zinc-400"
                    }`}
                  >
                    <span className="text-lg" aria-hidden>▶</span>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Greeting</label>
              <textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder={defaultGreeting}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 text-zinc-400">Personality: Professional ←→ Friendly</label>
              <input
                type="range"
                min={0}
                max={100}
                value={personality}
                onChange={(e) => setPersonality(Number(e.target.value))}
                className="w-full h-2 rounded-lg accent-zinc-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2.5 px-4 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-400"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — TEACH YOUR AI */}
        {step === 3 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold">Teach your AI</h1>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Services (type and Enter to add)</label>
              <input
                type="text"
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addService())}
                placeholder="e.g. Plumbing, HVAC"
                className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
              {services.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {services.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 text-sm"
                    >
                      {s}
                      <button type="button" onClick={() => setServices((x) => x.filter((i) => i !== s))} className="text-zinc-500 hover:text-white">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <span className="block text-xs font-medium mb-2 text-zinc-400">Hours (Mon–Sun)</span>
              <p className="text-sm text-zinc-500 mb-2">Open/Close time pickers and Closed toggle per day — use defaults for now.</p>
              <div className="h-24 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center text-zinc-500 text-sm">
                Hours grid placeholder
              </div>
            </div>
            <div>
              <span className="block text-xs font-medium mb-2 text-zinc-400">After hours</span>
              <div className="space-y-2">
                {(["messages", "emergency", "forward"] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="afterHours"
                      checked={afterHours === opt}
                      onChange={() => setAfterHours(opt)}
                      className="rounded-full"
                    />
                    <span className="text-sm">
                      {opt === "messages" && "Take messages"}
                      {opt === "emergency" && "Emergency only"}
                      {opt === "forward" && "Forward to cell"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">FAQ (3 pre-filled rows)</label>
              {faqRows.map((row, i) => (
                <input
                  key={i}
                  type="text"
                  value={row}
                  onChange={(e) => {
                    const next = [...faqRows];
                    next[i] = e.target.value;
                    setFaqRows(next);
                  }}
                  placeholder={`FAQ ${i + 1}`}
                  className="w-full px-4 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none mt-2"
                />
              ))}
              <button
                type="button"
                onClick={() => setFaqRows((r) => [...r, ""])}
                className="mt-2 text-sm text-zinc-400 hover:text-white"
              >
                Add another
              </button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="py-2.5 px-4 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-400">← Back</button>
              <button type="button" onClick={() => setStep(4)} className="flex-1 py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200">Continue →</button>
            </div>
          </div>
        )}

        {/* Step 4 — YOUR PHONE NUMBER */}
        {step === 4 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold">Your phone number</h1>
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
              <p className="text-2xl font-semibold mb-1">{phoneDisplay}</p>
              <p className="text-xs text-zinc-500">Provisioned number placeholder</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 text-zinc-400">Forward your existing number</label>
              <select className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:border-zinc-500 focus:outline-none">
                <option>AT&T: dial *21*number#</option>
                <option>Verizon: dial *72+number</option>
                <option>T-Mobile: dial **21*number#</option>
                <option>Other: contact carrier</option>
              </select>
            </div>
            <p className="text-sm text-zinc-400">Or use this as your new business number.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(3)} className="py-2.5 px-4 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-400">← Back</button>
              <button type="button" onClick={() => setStep(5)} className="flex-1 py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200">Continue →</button>
            </div>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="block w-full text-center text-sm text-zinc-500 hover:text-zinc-400"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Step 5 — TEST IT */}
        {step === 5 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold">Test it</h1>
            <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
              <p className="text-sm text-zinc-400 mb-2">Call this number now to hear your AI agent!</p>
              <p className="text-2xl font-semibold mb-4">{phoneDisplay}</p>
              {!testComplete ? (
                <p className="text-sm text-zinc-500">Simulated test: wait 3 seconds for success.</p>
              ) : (
                <div className="text-green-500 font-medium flex items-center justify-center gap-2">
                  <span className="text-2xl">✓</span> Your AI agent is live! 🎉
                </div>
              )}
            </div>
            {!testComplete && (
              <button
                type="button"
                onClick={() => {
                  setTimeout(() => setTestComplete(true), 3000);
                }}
                className="w-full py-3 rounded-xl border border-zinc-600 text-zinc-300 hover:border-zinc-500"
              >
                Simulate call (3 sec)
              </button>
            )}
            <button
              type="button"
              onClick={finishOnboarding}
              className="w-full py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200"
            >
              Go to your dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
