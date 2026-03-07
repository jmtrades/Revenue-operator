"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  ClipboardList,
  Headphones,
  MoonStar,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import { useOnboardingStep } from "../OnboardingStepContext";
import { speakTextViaApi } from "@/lib/voice-preview";
import { Waveform } from "@/components/Waveform";
import { WorkspaceVoiceButton } from "@/components/WorkspaceVoiceButton";
import { CURATED_VOICES, DEFAULT_VOICE_ID } from "@/lib/constants/curated-voices";
import { INDUSTRY_OPTIONS } from "@/lib/constants/industries";

const ONBOARDING_INDUSTRY_PRIMARY = INDUSTRY_OPTIONS.slice(0, 8);
const ONBOARDING_INDUSTRY_REST = INDUSTRY_OPTIONS.slice(8);
import { buildStarterKnowledge, mergeKnowledgeItems, type KnowledgeItem } from "@/lib/workspace/starter-knowledge";
import { getIndustryLabel } from "@/lib/constants/industries";
import { invalidateWorkspaceMeCache } from "@/lib/client/workspace-me";

const STEPS = 5;
const AGENT_NAMES = ["Sarah", "Alex", "Emma", "James", "Mike", "Lisa"];
const VOICES = CURATED_VOICES.map((voice) => ({
  id: voice.id,
  label: `${voice.name} — ${voice.desc}`,
  gender: voice.gender,
  preview: "Thanks for calling. How can I help you today?",
}));
const ONBOARDING_VOICES = CURATED_VOICES.slice(0, 6).map((v) => ({
  id: v.id,
  name: v.name,
  desc: v.desc,
  gender: v.gender,
  preview: "Thanks for calling. How can I help you today?",
}));

const PERSONALITY_STOPS = [
  { value: 0, label: "Very Professional" },
  { value: 25, label: "Professional" },
  { value: 50, label: "Balanced" },
  { value: 75, label: "Friendly" },
  { value: 100, label: "Very Friendly" },
];

const CALL_STYLES = [
  { id: "thorough", label: "Thorough", desc: "Asks clarifying questions, confirms details" },
  { id: "conversational", label: "Conversational", desc: "Natural back-and-forth, brief confirmations" },
  { id: "quick", label: "Quick", desc: "Gets to the point, minimal small talk" },
] as const;

const ONBOARDING_TEMPLATES = [
  {
    id: "receptionist",
    name: "Receptionist",
    description: "Answers calls, takes messages, and routes callers cleanly.",
    icon: Headphones,
    agentName: "Sarah",
    greeting: "Thanks for calling. I can help with questions, messages, and getting you to the right next step.",
  },
  {
    id: "appointment_scheduler",
    name: "Appointment Scheduler",
    description: "Books, confirms, and reminds without back-and-forth.",
    icon: CalendarRange,
    agentName: "Emma",
    greeting: "Thanks for calling. I can help you find a time, confirm the details, and book it now.",
  },
  {
    id: "lead_qualifier",
    name: "Lead Qualifier",
    description: "Captures key details and routes the hottest opportunities first.",
    icon: ClipboardList,
    agentName: "Alex",
    greeting: "Thanks for reaching out. I’ll ask a few quick questions so we can get you to the right next step.",
  },
  {
    id: "after_hours",
    name: "After-Hours Agent",
    description: "Handles closed-office calls gracefully and flags urgency.",
    icon: MoonStar,
    agentName: "Sarah",
    greeting: "You’ve reached us after hours. I can take your details now and make sure the right follow-up happens next.",
  },
  {
    id: "follow_up",
    name: "Follow-Up Agent",
    description: "Re-engages callers and leads so nothing gets dropped.",
    icon: PhoneCall,
    agentName: "Alex",
    greeting: "Hi, I’m following up so nothing slips through. I can confirm your status and help with the next step.",
  },
  {
    id: "custom",
    name: "Custom",
    description: "Start from scratch and shape the tone yourself.",
    icon: Sparkles,
    agentName: "Sarah",
    greeting: "Thanks for calling. How can I help you today?",
  },
] as const;

type AgentId = "sarah" | "alex" | "emma";
function agentNameToId(name: string): AgentId {
  const n = (name || "Sarah").trim().toLowerCase();
  if (n === "alex") return "alex";
  if (n === "emma") return "emma";
  return "sarah";
}

export default function AppOnboardingPage() {
  const router = useRouter();
  const onboardingCtx = useOnboardingStep();
  const step = onboardingCtx?.step ?? 1;
  const setStep = onboardingCtx?.setStep ?? (() => {});

  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [businessPhone, setBusinessPhone] = useState("");
  const [showAllIndustries, setShowAllIndustries] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rt_signup") ?? localStorage.getItem("recalltouch_signup");
      if (raw) {
        const d = JSON.parse(raw) as { businessName?: string; businessType?: string; industry?: string; website?: string };
        if (d?.businessName?.trim()) setBusinessName(d.businessName.trim());
        if (d?.industry?.trim() || d?.businessType?.trim()) setIndustry(d?.industry ?? d?.businessType ?? "");
        if (d?.website?.trim()) setWebsite(d.website.trim());
      }
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
      setTimezone(tz);
    } catch {
      // ignore
    }
  }, []);

  const [selectedTemplate, setSelectedTemplate] = useState<string>("receptionist");
  const [agentName, setAgentName] = useState<string>(ONBOARDING_TEMPLATES[0].agentName);
  const [voiceId, setVoiceId] = useState<string>(DEFAULT_VOICE_ID);
  const [greeting, setGreeting] = useState<string>(ONBOARDING_TEMPLATES[0].greeting);
  const [personality, setPersonality] = useState(50);
  const [callStyle, setCallStyle] = useState<"thorough" | "conversational" | "quick">("conversational");
  const [greetingPlaying, setGreetingPlaying] = useState(false);

  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState("");
  const [_hours, _setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({});
  const [afterHours, setAfterHours] = useState<"messages" | "emergency" | "forward">("messages");
  const [faqRows, setFaqRows] = useState<string[]>(["", "", ""]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [starterAdded, setStarterAdded] = useState(false);

  const [phoneDisplay] = useState("(503) 555-0100");
  const [_numberOption, _setNumberOption] = useState<"forward" | "new" | "skip">("new");
  const [showConfetti, setShowConfetti] = useState(false);

  const defaultGreeting = `Thanks for calling ${businessName || "[Business]"}! This is ${agentName}. How can I help you today?`;

  const addService = () => {
    const t = serviceInput.trim();
    if (t && !services.includes(t)) {
      setServices((s) => [...s, t]);
      setServiceInput("");
    }
  };

  const finishOnboarding = async () => {
    const defaultHours = {
      monday: { start: "09:00", end: "17:00" },
      tuesday: { start: "09:00", end: "17:00" },
      wednesday: { start: "09:00", end: "17:00" },
      thursday: { start: "09:00", end: "17:00" },
      friday: { start: "09:00", end: "17:00" },
    };
    const starter = buildStarterKnowledge({ industry, address, businessHours: defaultHours, services });
    const merged = mergeKnowledgeItems(knowledgeItems, starter);

    try {
      await fetch("/api/workspace/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          businessPhone: businessPhone || null,
          website,
          address,
          industry,
          agentName,
          greeting: greetingToPlay,
          knowledgeItems: merged,
          preferredLanguage: "en",
          elevenlabsVoiceId: voiceId,
          businessHours: defaultHours,
        }),
      });
      await fetch("/api/workspace/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingCompletedAt: new Date().toISOString(),
        }),
      });
      invalidateWorkspaceMeCache();
      await fetch("/api/vapi/create-agent", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    } catch {
      // ignore and continue to local fallbacks
    }
    try {
      localStorage.setItem("rt_onboarded", "true");
      localStorage.setItem("rt_onboarding_checklist", JSON.stringify(["business", "agent", "services", "phone", "test_call"]));
    } catch {
      // ignore
    }
    router.push("/app/activity");
  };

  const handleGoToDashboard = () => {
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      void finishOnboarding();
    }, 1600);
  };

  const greetingToPlay = greeting.trim() || defaultGreeting;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#080d19] to-[#0a0f1e] text-white flex flex-col p-6 md:p-12">
      <div className="max-w-2xl mx-auto w-full">
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-2" aria-label={`Step ${step} of ${STEPS}`}>
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

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 md:p-8">
        {/* Step 1 — YOUR BUSINESS */}
        {step === 1 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-white">Tell us about your business</h1>
            <p className="text-sm text-zinc-400">We&apos;ll configure your AI based on this.</p>
            <div>
              <label htmlFor="onboarding-business-name" className="block text-xs font-medium mb-1.5 text-zinc-400">Business name</label>
              <input
                id="onboarding-business-name"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Portland Plumbing Co"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 focus:outline-none text-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Industry</label>
              <div className="flex flex-wrap gap-2">
                {(showAllIndustries ? INDUSTRY_OPTIONS : ONBOARDING_INDUSTRY_PRIMARY).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setIndustry(id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      industry === id ? "bg-white/[0.1] border-white/30 text-white" : "bg-transparent border-white/[0.08] text-white/70 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {ONBOARDING_INDUSTRY_REST.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllIndustries((v) => !v)}
                  className="mt-2 text-xs text-zinc-400 hover:text-white underline underline-offset-2"
                >
                  {showAllIndustries ? "Show less" : "See all industries"}
                </button>
              )}
            </div>
            <div>
              <label htmlFor="onboarding-phone" className="block text-xs font-medium mb-1.5 text-zinc-400">Phone number (we&apos;ll call it to verify)</label>
              <input
                id="onboarding-phone"
                type="tel"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 focus:outline-none text-base"
              />
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3.5 px-8 bg-white text-[#080d19] rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — YOUR AI AGENT */}
        {step === 2 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-white">Choose how your AI sounds</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ONBOARDING_VOICES.map((v) => {
                const selected = voiceId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { setVoiceId(v.id); setAgentName(v.name); }}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selected ? "border-white/30 bg-white/[0.1] ring-2 ring-white/20" : "border-white/[0.08] bg-transparent hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white">{v.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void speakTextViaApi(v.preview, { gender: v.gender, voiceId: v.id }); }}
                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white text-xs"
                        aria-label={`Preview ${v.name}`}
                      >
                        ▶
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{v.desc}</p>
                    {selected && <p className="text-[10px] text-white/80 mt-1">✓ Selected</p>}
                  </button>
                );
              })}
            </div>
            <div>
              <label htmlFor="onboarding-greeting" className="block text-xs font-medium mb-1.5 text-zinc-400">Your AI will say</label>
              <textarea
                id="onboarding-greeting"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder={defaultGreeting}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 focus:outline-none resize-none text-base"
              />
              <button
                type="button"
                onClick={() => {
                  setGreetingPlaying(true);
                  void speakTextViaApi(greetingToPlay, {
                    gender: ONBOARDING_VOICES.find((x) => x.id === voiceId)?.gender ?? "female",
                    voiceId: voiceId || undefined,
                    onEnd: () => setGreetingPlaying(false),
                  });
                }}
                className="mt-2 flex items-center gap-2 py-2.5 px-4 rounded-xl border border-white/[0.08] text-zinc-300 hover:text-white hover:border-white/20 text-sm"
              >
                {greetingPlaying ? <Waveform isPlaying /> : <span>▶</span>}
                Hear it
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2.5 px-4 rounded-xl text-sm font-medium border border-white/[0.08] text-zinc-400 hover:text-white"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 px-8 bg-white text-[#080d19] rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — TEACH YOUR AI */}
        {step === 3 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-white">What should your AI know?</h1>
            <p className="text-sm text-zinc-400">Add a few Q&As so your AI can answer real questions.</p>
            {!starterAdded && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-zinc-300">
                  <span className="text-white font-medium">We&apos;ve prepared 5 starter entries</span> for {getIndustryLabel(industry || null)} businesses. You can edit them or add your own.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const starter = buildStarterKnowledge({
                      industry: industry || null,
                      address: address || null,
                      businessHours: { monday: { start: "09:00", end: "17:00" }, tuesday: { start: "09:00", end: "17:00" }, wednesday: { start: "09:00", end: "17:00" }, thursday: { start: "09:00", end: "17:00" }, friday: { start: "09:00", end: "17:00" } },
                      services: services.length > 0 ? services : null,
                    });
                    setKnowledgeItems(starter);
                    setStarterAdded(true);
                  }}
                  className="shrink-0 py-2.5 px-4 rounded-xl bg-white text-[#080d19] font-semibold text-sm hover:bg-white/90"
                >
                  Add them now
                </button>
              </div>
            )}
            <div className="space-y-3">
              {knowledgeItems.map((item, i) => (
                <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <p className="text-xs font-medium text-zinc-400 mb-0.5">Q: {item.q}</p>
                  <p className="text-sm text-zinc-300 mb-2">A: {item.a}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const q = (window.prompt("Question", item.q) ?? item.q ?? "").trim();
                        const a = (window.prompt("Answer", item.a) ?? item.a ?? "").trim();
                        const next = [...knowledgeItems];
                        next[i] = { q, a };
                        setKnowledgeItems(next);
                      }}
                      className="text-xs text-zinc-400 hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setKnowledgeItems((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs text-zinc-400 hover:text-red-400"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setKnowledgeItems((prev) => [...prev, { q: "", a: "" }])}
                className="w-full py-2.5 rounded-xl border border-dashed border-white/[0.12] text-zinc-400 hover:text-white hover:border-white/20 text-sm"
              >
                + Add another Q&A
              </button>
            </div>
            <p className="text-xs text-zinc-500">You can always add more later in your agent settings.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="py-2.5 px-4 rounded-xl text-sm font-medium border border-white/[0.08] text-zinc-400 hover:text-white">← Back</button>
              <button type="button" onClick={() => setStep(4)} className="flex-1 py-3.5 px-8 bg-white text-[#080d19] rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all">Continue →</button>
            </div>
          </div>
        )}

        {/* Step 4 — TEST YOUR AI */}
        {step === 4 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-white">Talk to your AI</h1>
            <p className="text-sm text-zinc-400">It&apos;s using your voice, greeting, and knowledge base.</p>
            <div className="flex justify-center py-6">
              <WorkspaceVoiceButton
                title=""
                description=""
                startLabel="Tap to start a test call"
                endLabel="End test"
                showUnavailable={true}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2">Try asking</p>
              <ul className="text-sm text-zinc-500 space-y-1">
                {knowledgeItems.slice(0, 3).map((item, i) => item.q && <li key={i}>&ldquo;{item.q}&rdquo;</li>)}
                {knowledgeItems.length === 0 && (
                  <>
                    <li>&ldquo;What are your hours?&rdquo;</li>
                    <li>&ldquo;I need to schedule a plumber&rdquo;</li>
                    <li>&ldquo;How much do you charge?&rdquo;</li>
                  </>
                )}
              </ul>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(3)} className="py-2.5 px-4 rounded-xl text-sm font-medium border border-white/[0.08] text-zinc-400 hover:text-white">← Back</button>
              <button type="button" onClick={() => setStep(5)} className="flex-1 py-3.5 px-8 bg-white text-[#080d19] rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all">Continue →</button>
            </div>
          </div>
        )}

        {/* Step 5 — GO LIVE */}
        {step === 5 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-white">You&apos;re ready.</h1>
            <p className="text-sm text-zinc-400">Your AI will answer calls at:</p>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="text-sm font-medium text-white mb-1">Forward your existing number</p>
              <p className="text-xs text-zinc-400 mb-2">Call your carrier and set up forwarding to your Recall Touch number.</p>
              <p className="text-sm font-mono text-white/90 mb-2">{phoneDisplay}</p>
              <a href="/app/settings/phone" className="text-xs text-white/80 hover:text-white underline">Show me how</a>
            </div>
            <p className="text-xs text-zinc-500 text-center">— or —</p>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="text-sm font-medium text-white mb-1">Get a new phone number</p>
              <p className="text-xs text-zinc-400 mb-2">We&apos;ll assign you a local number instantly.</p>
              <a href="/app/settings/phone" className="inline-block py-2 px-4 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20">Get my number →</a>
            </div>
            <p className="text-xs text-zinc-500 text-center">— or —</p>
            <p className="text-sm text-zinc-500 text-center">Skip for now — I&apos;ll connect a number later.</p>
            <button
              type="button"
              onClick={handleGoToDashboard}
              className="w-full py-3.5 px-8 bg-white text-[#080d19] rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              Launch my AI →
            </button>
          </div>
        )}
        </div>
      </div>

      {showConfetti && (
        <ConfettiOverlay />
      )}
    </div>
  );
}

const CONFETTI_PARTICLES = (() => {
  const dx = [-120, -90, -60, -30, 0, 30, 60, 90, 120, -100, -70, -40, 40, 70, 100, -80, -50, 50, 80, -110, -20, 20, 110, -95, -25, 25, 95, -85, -55, 55, 85, -45, 45];
  const colors = ["#fff", "#22c55e", "#a3e635", "#71717a", "#d4d4d8"];
  return dx.map((d, i) => ({ dx: d, delay: i * 35, color: colors[i % colors.length]! }));
})();

function ConfettiOverlay() {
  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
      aria-hidden
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {CONFETTI_PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-sm animate-confetti-fall"
            style={{
              left: "50%",
              top: "40%",
              marginLeft: -4,
              marginTop: -4,
              backgroundColor: p.color,
              ["--confetti-dx" as string]: `${p.dx}px`,
              animationDelay: `${p.delay}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
