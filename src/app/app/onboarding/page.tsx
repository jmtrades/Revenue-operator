"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  CheckCircle2,
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
import { USE_CASE_OPTIONS } from "@/lib/constants/use-cases";
import { buildStarterKnowledge, mergeKnowledgeItems, type KnowledgeItem } from "@/lib/workspace/starter-knowledge";
import { invalidateWorkspaceMeCache } from "@/lib/client/workspace-me";

const STEPS = 5;
const STEP_LABELS: { id: number; title: string; subtitle: string }[] = [
  { id: 1, title: "Business", subtitle: "Who you are" },
  { id: 2, title: "AI Agent", subtitle: "How it sounds" },
  { id: 3, title: "Knowledge", subtitle: "What it knows" },
  { id: 4, title: "Phone", subtitle: "How calls reach it" },
  { id: 5, title: "Test", subtitle: "Make sure it works" },
];
const ONBOARDING_VOICES = CURATED_VOICES.slice(0, 6).map((v) => ({
  id: v.id,
  name: v.name,
  desc: v.desc,
  gender: v.gender,
  preview: "Thanks for calling. How can I help you today?",
}));

const ONBOARDING_TEST_SCENARIOS = [
  { id: "normal", title: "Normal call", description: "Standard inquiry", phrase: "Hi, I need some information about your services." },
  { id: "angry", title: "Angry caller", description: "Tests empathy and transfer", phrase: "I've been waiting for a callback for days. I'm really frustrated." },
  { id: "booking", title: "Booking request", description: "Tests appointment flow", phrase: "I'd like to schedule an appointment for this week." },
  { id: "afterhours", title: "After hours", description: "Tests closed behavior", phrase: "Are you open right now? What are your hours?" },
  { id: "unknown", title: "Unknown question", description: "Tests fallback", phrase: "Do you offer XYZ service? I didn't see it on your website." },
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

export default function AppOnboardingPage() {
  const router = useRouter();
  const onboardingCtx = useOnboardingStep();
  const step = onboardingCtx?.step ?? 1;
  const setStep = onboardingCtx?.setStep ?? (() => {});

  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [useCases, setUseCases] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [_timezone, setTimezone] = useState("America/Los_Angeles");
  const [businessPhone, setBusinessPhone] = useState("");

  useEffect(() => {
    const apply = () => {
      try {
        const raw = localStorage.getItem("rt_signup") ?? localStorage.getItem("recalltouch_signup");
        if (raw) {
          const d = JSON.parse(raw) as { businessName?: string; businessType?: string; industry?: string; website?: string };
          if (d?.businessName?.trim()) setBusinessName(d.businessName.trim());
          if (d?.website?.trim()) setWebsite(d.website.trim());
        }
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
        setTimezone(tz);
      } catch {
        // ignore
      }
    };
    const id = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(id);
  }, []);

  const [_selectedTemplate, _setSelectedTemplate] = useState<string>("receptionist");
  const [agentName, setAgentName] = useState<string>(ONBOARDING_TEMPLATES[0].agentName);
  const [voiceId, setVoiceId] = useState<string>(DEFAULT_VOICE_ID);
  const [greeting, setGreeting] = useState<string>(ONBOARDING_TEMPLATES[0].greeting);
  const [_personality, _setPersonality] = useState(50);
  const [_callStyle, _setCallStyle] = useState<"thorough" | "conversational" | "quick">("conversational");
  const [greetingPlaying, setGreetingPlaying] = useState(false);

  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState("");
  const [_hours, _setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({});
  const [_afterHours, _setAfterHours] = useState<"messages" | "emergency" | "forward">("messages");
  const [_faqRows, _setFaqRows] = useState<string[]>(["", "", ""]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [starterAdded, setStarterAdded] = useState(false);
  const [businessHoursDisplay, setBusinessHoursDisplay] = useState("");

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
    const starter = buildStarterKnowledge({ useCases, address, businessHours: defaultHours, services });
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
          useCases: useCases.length ? useCases : undefined,
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
    <div className="min-h-screen bg-black text-white flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-zinc-900 bg-zinc-950 px-6 py-8 gap-8">
        <div>
          <p className="text-xs font-semibold tracking-wide text-zinc-400">
            Recall Touch
          </p>
          <p className="text-sm text-zinc-500 mt-1">Onboarding</p>
        </div>
        <nav aria-label="Onboarding steps" className="space-y-4">
          {STEP_LABELS.map((s) => {
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-start gap-3">
                <span
                  className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${
                    active ? "bg-white" : "bg-zinc-700"
                  }`}
                  aria-hidden
                />
                <div>
                  <p
                    className={`text-xs font-medium ${
                      active ? "text-white" : "text-zinc-400"
                    }`}
                  >
                    {s.id}. {s.title}
                  </p>
                  <p className="text-[11px] text-zinc-500">{s.subtitle}</p>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col px-4 py-6 md:px-10 md:py-10">
        <div className="max-w-2xl mx-auto w-full">
          <div className="mb-6 md:hidden">
            <div
              className="flex items-center justify-center gap-2 mb-2"
              aria-label={`Step ${step} of ${STEPS}`}
            >
              {Array.from({ length: STEPS }, (_, i) => (
                <span
                  key={i}
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    i + 1 <= step ? "bg-white" : "bg-zinc-700"
                  }`}
                  aria-hidden
                />
              ))}
            </div>
            <p className="text-xs text-center text-zinc-500">
              Step {step} of {STEPS}
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8">
        {/* Step 1 — YOUR BUSINESS */}
        {step === 1 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-white">
              Welcome to Recall Touch!
            </h1>
            <p className="text-sm text-zinc-400">
              Let&apos;s get your AI phone system running in 2 minutes.
            </p>
            <div>
              <label htmlFor="onboarding-business-name" className="block text-xs font-medium mb-1.5 text-zinc-400">Business name</label>
              <input
                id="onboarding-business-name"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Portland Plumbing Co"
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-focus)] focus:ring-1 focus:ring-zinc-500/40 focus:outline-none text-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-zinc-400">What will your AI handle?</label>
              <p className="text-[11px] text-[var(--text-secondary)] mb-2">Select all that apply. This shapes your default knowledge and agent behavior.</p>
              <div className="flex flex-wrap gap-2">
                {USE_CASE_OPTIONS.map(({ id, label }) => {
                  const selected = useCases.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setUseCases((prev) => (selected ? prev.filter((x) => x !== id) : [...prev, id]))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        selected ? "bg-[var(--bg-hover)] border-[var(--border-medium)] text-[var(--text-primary)]" : "bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label htmlFor="onboarding-website" className="block text-xs font-medium mb-1.5 text-zinc-400">Website</label>
              <input
                id="onboarding-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                If you have a site, we&apos;ll use it to pre-fill your hours, services, and FAQs.
              </p>
            </div>
            <div>
              <label htmlFor="onboarding-address" className="block text-xs font-medium mb-1.5 text-zinc-400">Address</label>
              <input
                id="onboarding-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, State"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                This helps your AI answer &ldquo;Where are you located?&rdquo; and give directions.
              </p>
            </div>
            <div>
              <label htmlFor="onboarding-phone" className="block text-xs font-medium mb-1.5 text-zinc-400">Phone number (we&apos;ll send a code to verify)</label>
              <input
                id="onboarding-phone"
                type="tel"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3.5 px-8 bg-white text-gray-900 rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2 — YOUR AI AGENT */}
        {step === 2 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Choose how your AI sounds</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ONBOARDING_VOICES.map((v) => {
                const selected = voiceId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { setVoiceId(v.id); setAgentName(v.name); }}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selected ? "border-[var(--border-medium)] bg-[var(--bg-hover)] ring-2 ring-zinc-500/40" : "border-[var(--border-default)] bg-transparent hover:border-[var(--border-medium)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{v.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void speakTextViaApi(v.preview, { gender: v.gender, voiceId: v.id }); }}
                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] text-xs"
                        aria-label={`Preview ${v.name}`}
                      >
                        ▶
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{v.desc}</p>
                    {selected && <p className="text-[10px] text-[var(--text-primary)] mt-1">✓ Selected</p>}
                  </button>
                );
              })}
            </div>
            <div>
              <label htmlFor="onboarding-greeting" className="block text-xs font-medium mb-1.5 text-zinc-400">Opening greeting</label>
              <p className="text-[11px] text-[var(--text-secondary)] mb-2">This is how your AI answers the phone. After this, it has a natural conversation based on your knowledge and rules.</p>
              <textarea
                id="onboarding-greeting"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder={defaultGreeting}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-focus)] focus:ring-1 focus:ring-zinc-500/40 focus:outline-none resize-none text-base"
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
                className="mt-2 flex items-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--border-default)] text-zinc-300 hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] text-sm"
              >
                {greetingPlaying ? <Waveform isPlaying /> : <span>▶</span>}
                Hear it
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2.5 px-4 rounded-xl text-sm font-medium border border-[var(--border-default)] text-zinc-400 hover:text-[var(--text-primary)]"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 px-8 bg-white text-gray-900 rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — TEACH YOUR AI */}
        {step === 3 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">What should your AI know?</h1>
            <p className="text-sm text-zinc-400">Add business details and Q&As so your AI can answer real questions.</p>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-4">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Business info</p>
              <div>
                <label htmlFor="onboarding-address" className="block text-[11px] text-zinc-500 mb-1">Address</label>
                <input
                  id="onboarding-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City, State"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-focus)] focus:ring-1 focus:ring-zinc-500/40 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="onboarding-hours" className="block text-[11px] text-zinc-500 mb-1">Hours</label>
                <input
                  id="onboarding-hours"
                  type="text"
                  value={businessHoursDisplay}
                  onChange={(e) => setBusinessHoursDisplay(e.target.value)}
                  placeholder="e.g. Monday–Friday 9 AM–5 PM"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-focus)] focus:ring-1 focus:ring-zinc-500/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Services</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {services.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => setServices((prev) => prev.filter((x) => x !== s))}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        aria-label={`Remove ${s}`}
                      >
                        &#215;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={serviceInput}
                    onChange={(e) => setServiceInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } }}
                    placeholder="Add a service"
                    className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-focus)] focus:ring-1 focus:ring-zinc-500/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addService}
                    className="shrink-0 px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
            {!starterAdded && (
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-zinc-300">
                  <span className="text-[var(--text-primary)] font-medium">We&apos;ve prepared starter entries</span> based on what you selected. You can edit them or add your own.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const starter = buildStarterKnowledge({
                      useCases: useCases.length > 0 ? useCases : null,
                      address: address || null,
                      businessHours: { monday: { start: "09:00", end: "17:00" }, tuesday: { start: "09:00", end: "17:00" }, wednesday: { start: "09:00", end: "17:00" }, thursday: { start: "09:00", end: "17:00" }, friday: { start: "09:00", end: "17:00" } },
                      services: services.length > 0 ? services : null,
                    });
                    const withHours = businessHoursDisplay.trim()
                      ? starter.map((item) =>
                          (item.q ?? "").toLowerCase().includes("hour")
                            ? { ...item, a: businessHoursDisplay.trim() }
                            : item
                        )
                      : starter;
                    setKnowledgeItems(withHours);
                    setStarterAdded(true);
                  }}
                  className="shrink-0 py-2.5 px-4 rounded-xl bg-white text-gray-900 font-semibold text-sm hover:bg-white/90"
                >
                  Add them now
                </button>
              </div>
            )}
            <div className="space-y-3">
              {knowledgeItems.map((item, i) => (
                <div key={i} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
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
                      className="text-xs text-zinc-400 hover:text-[var(--text-primary)]"
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
                className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-medium)] text-zinc-400 hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] text-sm"
              >
                + Add another Q&A
              </button>
            </div>
            <p className="text-xs text-zinc-500">You can always add more later in your agent settings.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="py-2.5 px-4 rounded-xl text-sm font-medium border border-[var(--border-default)] text-zinc-400 hover:text-[var(--text-primary)]">← Back</button>
              <button type="button" onClick={() => setStep(4)} className="flex-1 py-3.5 px-8 bg-white text-gray-900 rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all">Continue →</button>
            </div>
          </div>
        )}

        {/* Step 4 — TEST YOUR AI */}
        {step === 4 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Talk to your AI</h1>
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
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Scenario simulator</p>
              <p className="text-[11px] text-zinc-500 mb-3">When you&apos;re on the test call, try saying one of these to see how your AI responds.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="list">
                {ONBOARDING_TEST_SCENARIOS.map((s) => (
                  <div
                    key={s.id}
                    role="listitem"
                    className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 text-left"
                  >
                    <p className="font-medium text-sm text-[var(--text-primary)]">{s.title}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{s.description}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-2">&ldquo;{s.phrase}&rdquo;</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(3)} className="py-2.5 px-4 rounded-xl text-sm font-medium border border-[var(--border-default)] text-zinc-400 hover:text-[var(--text-primary)]">← Back</button>
              <button type="button" onClick={() => setStep(5)} className="flex-1 py-3.5 px-8 bg-white text-gray-900 rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all">Continue →</button>
            </div>
          </div>
        )}

        {/* Step 5 — GO LIVE */}
        {step === 5 && (
          <div className="space-y-6">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">You&apos;re ready.</h1>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Readiness checklist</p>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex items-center gap-2">
                  {greeting.trim() ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden /> : <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border-medium)] text-[var(--text-tertiary)]" aria-hidden />}
                  <span className={greeting.trim() ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>Greeting configured</span>
                </li>
                <li className="flex items-center gap-2">
                  {voiceId?.trim() ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden /> : <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border-medium)] text-[var(--text-tertiary)]" aria-hidden />}
                  <span className={voiceId?.trim() ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>Voice selected</span>
                </li>
                <li className="flex items-center gap-2">
                  {knowledgeItems.filter((i) => (i.q ?? "").trim() && (i.a ?? "").trim()).length >= 3 ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden /> : <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border-medium)] text-[var(--text-tertiary)]" aria-hidden />}
                  <span className={knowledgeItems.filter((i) => (i.q ?? "").trim() && (i.a ?? "").trim()).length >= 3 ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>At least 3 knowledge entries</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border-medium)] text-[var(--text-tertiary)]" aria-hidden />
                  <span className="text-[var(--text-secondary)]">Phone connection (optional now)</span>
                </li>
              </ul>
            </div>
            <p className="text-sm text-zinc-400">Your AI will answer calls at:</p>
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Forward your existing number</p>
              <p className="text-xs text-zinc-400 mb-2">Call your carrier and set up forwarding to your Recall Touch number.</p>
              <p className="text-sm font-mono text-[var(--text-primary)] mb-2">{phoneDisplay}</p>
              <a href="/app/settings/phone" className="text-xs text-[var(--text-primary)] hover:text-[var(--text-primary)] underline">Show me how</a>
            </div>
            <p className="text-xs text-zinc-500 text-center">— or —</p>
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Get a new phone number</p>
              <p className="text-xs text-zinc-400 mb-2">We&apos;ll assign you a local number instantly.</p>
              <a href="/app/settings/phone" className="inline-block py-2 px-4 rounded-xl bg-[var(--bg-hover)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-active)]">Get my number →</a>
            </div>
            <p className="text-xs text-zinc-500 text-center">— or —</p>
            <p className="text-sm text-zinc-500 text-center">Skip for now — I&apos;ll connect a number later.</p>
            <button
              type="button"
              onClick={handleGoToDashboard}
              className="w-full py-3.5 px-8 bg-white text-gray-900 rounded-xl font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              Go to my dashboard →
            </button>
          </div>
        )}
          </div>
        </div>

        {showConfetti && <ConfettiOverlay />}
      </div>
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
