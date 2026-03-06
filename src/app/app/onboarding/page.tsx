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
import { LiveAgentChat } from "@/components/LiveAgentChat";
import { WorkspaceVoiceButton } from "@/components/WorkspaceVoiceButton";
import { CURATED_VOICES, DEFAULT_VOICE_ID } from "@/lib/constants/curated-voices";
import { INDUSTRY_OPTIONS } from "@/lib/constants/industries";
import { buildStarterKnowledge, mergeKnowledgeItems } from "@/lib/workspace/starter-knowledge";

const STEPS = 5;
const AGENT_NAMES = ["Sarah", "Alex", "Emma", "James", "Mike", "Lisa"];
const VOICES = CURATED_VOICES.map((voice) => ({
  id: voice.id,
  label: `${voice.name} — ${voice.desc}`,
  gender: voice.gender,
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

  const [selectedTemplate, setSelectedTemplate] = useState<string>("receptionist");
  const [agentName, setAgentName] = useState<string>(ONBOARDING_TEMPLATES[0].agentName);
  const [voiceId, setVoiceId] = useState<string>(DEFAULT_VOICE_ID);
  const [greeting, setGreeting] = useState<string>(ONBOARDING_TEMPLATES[0].greeting);
  const [personality, setPersonality] = useState(50);
  const [callStyle, setCallStyle] = useState<"thorough" | "conversational" | "quick">("conversational");
  const [greetingPlaying, setGreetingPlaying] = useState(false);
  const [step5Playing, setStep5Playing] = useState(false);

  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState("");
  const [_hours, _setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({});
  const [afterHours, setAfterHours] = useState<"messages" | "emergency" | "forward">("messages");
  const [faqRows, setFaqRows] = useState<string[]>(["", "", ""]);

  const [phoneDisplay] = useState("(503) 555-0100");
  const [_numberOption, _setNumberOption] = useState<"forward" | "new" | "skip">("new");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  const onboardingCtx = useOnboardingStep();

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

  useEffect(() => {
    onboardingCtx?.setStep(step);
  }, [step, onboardingCtx]);

  const defaultGreeting = `Thanks for calling ${businessName || "[Business]"}! This is ${agentName}. How can I help you today?`;

  const addService = () => {
    const t = serviceInput.trim();
    if (t && !services.includes(t)) {
      setServices((s) => [...s, t]);
      setServiceInput("");
    }
  };

  const finishOnboarding = async () => {
    const knowledgeItems = mergeKnowledgeItems(
      faqRows
        .map((row) => row.trim())
        .filter(Boolean)
        .map((row) => ({ q: row, a: "I can help with that during your call." })),
      buildStarterKnowledge({
        industry,
        address,
        businessHours: {
          monday: { start: "09:00", end: "17:00" },
          tuesday: { start: "09:00", end: "17:00" },
          wednesday: { start: "09:00", end: "17:00" },
          thursday: { start: "09:00", end: "17:00" },
          friday: { start: "09:00", end: "17:00" },
        },
        services,
      }),
    );

    try {
      await fetch("/api/workspace/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          businessPhone: null,
          website,
          address,
          industry,
          agentName,
          greeting: greetingToPlay,
          knowledgeItems,
          preferredLanguage: "en",
          elevenlabsVoiceId: voiceId,
          businessHours: {
            monday: { start: "09:00", end: "17:00" },
            tuesday: { start: "09:00", end: "17:00" },
            wednesday: { start: "09:00", end: "17:00" },
            thursday: { start: "09:00", end: "17:00" },
            friday: { start: "09:00", end: "17:00" },
          },
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
  const selectedVoice = VOICES.find((v) => v.id === voiceId);

  const scriptPreviewText =
    callStyle === "thorough"
      ? `${agentName} will greet the caller, ask what they need, then ask 1–2 clarifying questions before offering next steps or booking.`
      : callStyle === "conversational"
        ? `${agentName} will keep it natural: brief greeting, confirm the reason for the call, then suggest an appointment or follow-up.`
        : `${agentName} will get straight to the point: quick greeting, confirm need, then offer the next step.`;

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
            <h1 className="text-xl font-bold text-white">Welcome to Recall Touch!</h1>
            <p className="text-sm text-zinc-400">Let&apos;s get your AI phone system running in 2 minutes.</p>
            <h2 className="text-lg font-semibold text-white">Your business</h2>
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
                {INDUSTRY_OPTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setIndustry(id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                      industry === id ? "bg-white/10 border-white text-white" : "bg-zinc-800/50 border-zinc-700 text-zinc-400"
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
              <p className="mt-1 text-xs text-zinc-500">We&apos;ll learn your services automatically.</p>
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
              <p className="mt-1 text-xs text-zinc-500">Used for local service area.</p>
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
            <h1 className="text-xl font-semibold text-white">Meet your AI</h1>
            <div>
              <label className="block text-xs font-medium mb-2 text-zinc-400">Choose a starting template</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ONBOARDING_TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  const active = selectedTemplate === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(template.id);
                        setAgentName(template.agentName);
                        setGreeting(template.greeting);
                      }}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? "border-blue-500 ring-2 ring-blue-500/40 bg-zinc-900/90"
                          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                          <Icon className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className={`rounded-xl px-2.5 py-1 text-[11px] font-medium ${active ? "bg-blue-500 text-white" : "bg-white/[0.04] text-zinc-400"}`}>
                          Select
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-white">{template.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">{template.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">Agent name</label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. Sarah"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:outline-none mb-2"
              />
              <div className="flex flex-wrap gap-2">
                {AGENT_NAMES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAgentName(n)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                      agentName === n ? "bg-white/10 border-white text-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 text-zinc-400">Voice</label>
              <div className="grid grid-cols-2 gap-2">
                {VOICES.map((v) => (
                  <div
                    key={v.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setVoiceId(v.id)}
                    onKeyDown={(e) => e.key === "Enter" && setVoiceId(v.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm cursor-pointer ${
                      voiceId === v.id ? "border-zinc-400 bg-zinc-800/80 text-white border-l-4 border-l-green-500" : "border-zinc-700 bg-zinc-800/50 text-zinc-400 border-l-4 border-l-transparent"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void speakTextViaApi(v.preview, { gender: v.gender, voiceId: v.id });
                      }}
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-white text-xs"
                      aria-label={`Preview ${v.label}`}
                    >
                      ▶
                    </button>
                    <span>{v.label}</span>
                  </div>
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
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-1 focus:outline-none resize-none"
              />
              <button
                type="button"
                onClick={() => {
                  setGreetingPlaying(true);
                  (window as unknown as { __stopGreeting?: () => void }).__stopGreeting = () => {};
                  void speakTextViaApi(greetingToPlay, {
                    gender: selectedVoice?.gender ?? "female",
                    voiceId: voiceId || undefined,
                    onEnd: () => setGreetingPlaying(false),
                  });
                }}
                className="mt-2 flex items-center gap-2 py-2 px-3 rounded-xl border border-zinc-700 text-zinc-300 hover:border-zinc-600 text-sm"
              >
                {greetingPlaying ? <Waveform isPlaying /> : <span>▶</span>}
                Preview Greeting
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 text-zinc-400">Personality</label>
              <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                <span>Very Professional</span>
                <span>Very Friendly</span>
              </div>
              <div className="flex gap-1">
                {PERSONALITY_STOPS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPersonality(value)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-medium border ${
                      personality === value ? "bg-white/10 border-white text-white" : "border-zinc-700 text-zinc-500"
                    }`}
                    title={label}
                  >
                    {value === 0 ? "Pro" : value === 25 ? "Pro+" : value === 50 ? "Mid" : value === 75 ? "Friendly" : "Very"}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-zinc-500">{PERSONALITY_STOPS.find((s) => s.value === personality)?.label ?? "Balanced"}</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 text-zinc-400">Call style</label>
              <div className="space-y-2">
                {CALL_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCallStyle(s.id)}
                    className={`w-full p-3 rounded-xl border text-left text-sm ${
                      callStyle === s.id ? "border-zinc-400 bg-zinc-800/80 text-white" : "border-zinc-700 bg-zinc-800/50 text-zinc-400"
                    }`}
                  >
                    <span className="font-medium">{s.label}</span>
                    <p className="text-xs text-zinc-500 mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <p className="text-xs font-medium text-zinc-400 mb-1">How {agentName} will handle a call</p>
              <p className="text-sm text-zinc-300">{scriptPreviewText}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900/50">
              <p className="text-xs font-medium text-zinc-400 px-4 pt-3 pb-1">Try talking to {agentName}</p>
              <LiveAgentChat
                variant="mini"
                initialAgent={agentNameToId(agentName)}
                businessName={businessName || undefined}
                greeting={greeting.trim() || undefined}
                personality={personality}
                callStyle={callStyle}
                showMic={true}
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

        {/* Step 3 — CUSTOMIZE */}
        {step === 3 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold">Customize your agent</h1>
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
              <span className="block text-xs font-medium mb-2 text-zinc-400">Business hours</span>
              <div className="space-y-1.5">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                  const isWeekend = day === "Sat" || day === "Sun";
                  return (
                    <div key={day} className="flex items-center gap-3 text-sm">
                      <span className="w-8 text-zinc-400 text-xs font-medium">{day}</span>
                      {isWeekend ? (
                        <span className="text-xs text-zinc-600">Closed</span>
                      ) : (
                        <span className="text-xs text-zinc-300">9:00 AM – 5:00 PM</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">Edit hours anytime in Settings → Call rules.</p>
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

        {/* Step 4 — TEST */}
        {step === 4 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold">Test your agent</h1>
            <p className="text-sm text-zinc-400">
              This is the magic moment. Start a live browser voice test to hear the exact assistant your workspace will use on calls.
            </p>
            <WorkspaceVoiceButton
              title={`Talk to ${agentName}`}
              description="Start a live browser voice session, watch the transcript below, and confirm the voice and tone feel right."
              startLabel="Start live test"
              endLabel="End live test"
              showUnavailable={true}
            />
            <div>
              <p className="text-xs font-medium mb-2 text-zinc-400">Want a phone-based test too?</p>
              <p className="text-sm text-zinc-500">
                You&apos;ll connect and forward your line on the next step. Once that&apos;s done, you can call <span className="font-medium text-white">{phoneDisplay}</span> or use Settings → Phone for a real phone test.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(3)} className="py-2.5 px-4 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-400">← Back</button>
              <button type="button" onClick={() => setStep(5)} className="flex-1 py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200">Continue →</button>
            </div>
          </div>
        )}

        {/* Step 5 — ACTIVATE */}
        {step === 5 && (
          <div className="space-y-6">
            <h1 className="text-xl font-semibold text-white">Activate</h1>
            <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
              <p className="text-sm text-zinc-400 mb-2">Your dedicated AI phone number</p>
              <p className="text-2xl font-semibold mb-4">{phoneDisplay}</p>
              <p className="text-sm text-zinc-500">Forward your existing line here or use it as your new business number.</p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 text-zinc-400">Using a personal or existing number?</label>
              <select className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:border-zinc-500 focus:outline-none">
                <option>AT&T: dial *21*number#</option>
                <option>Verizon: dial *72+number</option>
                <option>T-Mobile: dial **21*number#</option>
                <option>Other: contact carrier</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep5Playing(true);
                void speakTextViaApi(greetingToPlay, {
                  gender: selectedVoice?.gender ?? "female",
                  voiceId: voiceId || undefined,
                  onEnd: () => setStep5Playing(false),
                });
              }}
              className="w-full py-3 rounded-xl border border-zinc-600 text-zinc-300 hover:border-zinc-500 flex items-center justify-center gap-2"
            >
              {step5Playing ? <Waveform isPlaying /> : <span>▶</span>}
              Preview the live greeting
            </button>
            <button
              type="button"
              onClick={handleGoToDashboard}
              className="w-full py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200"
            >
              Go to my dashboard →
            </button>
          </div>
        )}
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
