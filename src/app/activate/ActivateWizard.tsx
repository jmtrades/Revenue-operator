"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { previewVoiceViaApi } from "@/lib/voice-preview";
import {
  AGENT_TEMPLATES,
  AGENT_TEMPLATE_CATEGORIES,
  type AgentTemplateCategory,
} from "@/lib/data/agent-templates";
import { Confetti } from "@/components/Confetti";
import { SUPPORTED_LANGUAGES } from "@/lib/constants/languages";

type StepId = 1 | 2 | 3 | 4 | 5;

type IndustryId =
  | "plumbing"
  | "dental"
  | "legal"
  | "real_estate"
  | "insurance"
  | "healthcare"
  | "salon"
  | "auto"
  | "restaurant"
  | "property_mgmt"
  | "roofing"
  | "other";

type AgentTemplateId = string;

type DayId = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

type TestFeedback = "up" | "down" | null;

interface HoursSlot {
  day: DayId;
  enabled: boolean;
  start: string;
  end: string;
}

type OrgTypeId = "business" | "solo" | "team" | "agency" | "personal" | "other";
type UseCaseId = "answer" | "book" | "followup" | "afterhours" | "outbound" | "route";

interface ElevenLabsVoice {
  id: string;
  name: string;
  labels: Record<string, string>;
  category: string;
}

interface ActivationState {
  businessName: string;
  industry: IndustryId | null;
  businessPhone: string;
  orgType: OrgTypeId | null;
  useCases: UseCaseId[];
  agentTemplate: AgentTemplateId | null;
  agentName: string;
  hours: HoursSlot[];
  greeting: string;
  services: string[];
  lastTestFeedback: TestFeedback;
  preferredLanguage: string;
  elevenlabsVoiceId: string;
}

const ORG_TYPES: { id: OrgTypeId; label: string }[] = [
  { id: "business", label: "Business" },
  { id: "solo", label: "Solo operator" },
  { id: "team", label: "Team" },
  { id: "agency", label: "Agency" },
  { id: "personal", label: "Personal" },
  { id: "other", label: "Other" },
];

const USE_CASE_OPTIONS: { id: UseCaseId; label: string }[] = [
  { id: "answer", label: "Answer incoming calls" },
  { id: "book", label: "Book appointments" },
  { id: "followup", label: "Follow up with leads" },
  { id: "afterhours", label: "Handle after-hours calls" },
  { id: "outbound", label: "Run outbound campaigns" },
  { id: "route", label: "Route and triage calls" },
];

const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: "Business" },
  { id: 2, label: "Agent" },
  { id: 3, label: "Customize" },
  { id: 4, label: "Test" },
  { id: 5, label: "Activate" },
];

const INDUSTRIES: { id: IndustryId; label: string; emoji: string }[] = [
  { id: "plumbing", label: "Plumbing", emoji: "🛠️" },
  { id: "dental", label: "Dental", emoji: "🦷" },
  { id: "legal", label: "Legal", emoji: "⚖️" },
  { id: "real_estate", label: "Real Estate", emoji: "🏡" },
  { id: "insurance", label: "Insurance", emoji: "📑" },
  { id: "healthcare", label: "Healthcare", emoji: "🏥" },
  { id: "salon", label: "Salon", emoji: "💇" },
  { id: "auto", label: "Auto Repair", emoji: "🚗" },
  { id: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { id: "property_mgmt", label: "Property Mgmt", emoji: "🏢" },
  { id: "roofing", label: "Roofing", emoji: "🏠" },
  { id: "other", label: "Other / General", emoji: "✨" },
];

const INDUSTRY_SERVICES: Record<IndustryId, string[]> = {
  plumbing: ["Drain cleaning", "Water heater", "Leak repair", "Emergency service", "Remodeling"],
  dental: ["New patients", "Cleanings", "Cosmetic", "Emergency", "Follow-up visits"],
  legal: ["Consultations", "Case updates", "Scheduling", "New inquiries"],
  real_estate: ["Buyer leads", "Seller leads", "Showings", "Open houses"],
  insurance: ["New policies", "Claims", "Billing questions", "Renewals"],
  healthcare: ["New patients", "Appointments", "Refills", "Follow-ups"],
  salon: ["Hair appointments", "Color", "Walk-ins", "Cancellations"],
  auto: ["Repairs", "Oil change", "Diagnostics", "Towing"],
  restaurant: ["Reservations", "Large parties", "Takeout", "Hours"],
  property_mgmt: ["Maintenance", "Leasing", "Tours", "Tenant support"],
  roofing: ["Inspections", "Repairs", "New roof", "Emergency tarping"],
  other: ["New inquiries", "Appointments", "Support", "Follow-ups"],
};

const DAYS: DayId[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_HOURS: HoursSlot[] = DAYS.map((day: DayId) => ({
  day,
  enabled: day !== "Sun",
  start: "09:00",
  end: "17:00",
}));

function getIndustryLabel(id: IndustryId | null): string {
  if (!id) return "your business";
  return INDUSTRIES.find((i) => i.id === id)?.label ?? "your business";
}

export function ActivateWizard() {
  const [step, setStep] = useState<StepId>(1);
  const [state, setState] = useState<ActivationState>(() => ({
    businessName: "",
    industry: null,
    businessPhone: "",
    orgType: null,
    useCases: [],
    agentTemplate: null,
    agentName: "",
    hours: DEFAULT_HOURS,
    greeting:
      "Hi, thanks for calling. How can I help you today?",
    services: [],
    lastTestFeedback: null,
    preferredLanguage: "en",
    elevenlabsVoiceId: "",
  }));

  const currentIndex = useMemo(
    () => STEPS.findIndex((s) => s.id === step),
    [step],
  );

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return (
        state.businessName.trim().length > 0 &&
        state.businessPhone.trim().length > 0
      );
    }
    if (step === 2) {
      return Boolean(state.agentTemplate);
    }
    if (step === 3) {
      return state.agentName.trim().length > 0 && state.greeting.trim().length > 0;
    }
    if (step === 4) {
      return false;
    }
    return true;
  }, [step, state]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    setStep((prev) => {
      const next = prev < 5 ? ((prev + 1) as StepId) : prev;
      if (prev === 1) {
        try {
          const bn = state.businessName.trim();
          if (bn) localStorage.setItem("rt_business_name", bn);
        } catch { /* ignore */ }
      }
      return next;
    });
  }, [canGoNext, state.businessName]);

  const goBack = useCallback(() => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as StepId) : prev));
  }, []);

  const handleKeyDownAdvance = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    e.preventDefault();
    goNext();
  };

  const industryServices =
    state.industry != null ? INDUSTRY_SERVICES[state.industry] : [];

  const effectiveServices =
    state.services.length > 0 ? state.services : industryServices;

  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  useEffect(() => {
    if (step !== 3) return;
    fetch("/api/agent/voices")
      .then((r) => r.json())
      .then((data: { voices?: ElevenLabsVoice[] }) => setVoices(data.voices ?? []))
      .catch(() => setVoices([]));
  }, [step]);

  const handlePlayTestGreeting = () => {
    const voiceText =
      state.greeting.trim().length > 0
        ? state.greeting.trim()
        : `Hi, thanks for calling ${state.businessName || "your business"}.`;
    previewVoiceViaApi(voiceText, {
      voiceId: state.elevenlabsVoiceId || undefined,
      gender: "female",
    });
  };

  const handleThumb = (fb: TestFeedback) => {
    setState((prev) => ({ ...prev, lastTestFeedback: fb }));
    if (fb === "up") {
      setStep(5);
    } else if (fb === "down") {
      setStep(3);
    }
  };

  const router = useRouter();
  const handleFinalize = useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault();
    try {
      if (state.businessName.trim()) {
        localStorage.setItem("rt_business_name", state.businessName.trim());
      }
      const existing = (() => {
        try {
          const raw = localStorage.getItem("rt_signup") ?? localStorage.getItem("recalltouch_signup");
          return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch { return {}; }
      })();
      localStorage.setItem("rt_signup", JSON.stringify({ ...existing, businessName: state.businessName.trim() }));

      const hoursObj = state.hours?.length
        ? { days: state.hours.map((h) => h.day), start: state.hours[0]?.start ?? "09:00", end: state.hours[0]?.end ?? "17:00", timezone: "UTC" }
        : undefined;
      const res = await fetch("/api/workspace/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: state.businessName.trim() || "My Workspace",
          businessPhone: state.businessPhone.trim() || undefined,
          industry: state.industry ?? undefined,
          orgType: state.orgType ?? undefined,
          agentTemplate: state.agentTemplate ?? undefined,
          agentName: state.agentName || undefined,
          greeting: state.greeting || undefined,
          businessHours: hoursObj,
          knowledgeItems: state.services?.length ? state.services.map((s) => ({ type: "service", value: s })) : undefined,
          preferredLanguage: state.preferredLanguage || "en",
          elevenlabsVoiceId: state.elevenlabsVoiceId || undefined,
        }),
      });
      if (res.ok) {
        fetch("/api/vapi/create-agent", { method: "POST", credentials: "include" }).catch(() => {});
      }
      if (process.env.NODE_ENV === "development" && !res.ok) {
        console.log("Workspace create:", res.status, await res.text());
      }
    } catch { /* ignore */ }
    router.push("/app");
  }, [state, router]);

  return (
    <Container>
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-sky-400">
            Activation
          </p>
          <h1 className="mt-3 text-2xl md:text-3xl font-semibold text-slate-50">
            Let&apos;s get your phone agent ready.
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xl">
            This takes about 3 minutes. You&apos;ll hear your agent handle a
            real call at the end.
          </p>
        </header>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-400">
              Step {currentIndex + 1} of {STEPS.length}
            </p>
            <p className="text-xs text-slate-500 hidden sm:block">
              {STEPS[currentIndex]?.label}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {STEPS.map((s, idx) => {
              const isActive = s.id === step;
              const isCompleted = idx < currentIndex;
              return (
                <div key={s.id} className="flex-1 flex items-center gap-2">
                  <button
                    type="button"
                    className={`h-2.5 w-2.5 rounded-full border transition-colors ${
                      isActive
                        ? "bg-sky-400 border-sky-300"
                        : isCompleted
                          ? "bg-sky-500/50 border-sky-400/70"
                          : "border-slate-600"
                    }`}
                    aria-label={s.label}
                    onClick={() => setStep(s.id)}
                  />
                  <span className="hidden md:inline text-[11px] text-slate-500">
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <section
          className="rounded-2xl border border-slate-800 bg-slate-950/40 px-5 py-6 md:px-7 md:py-7 shadow-[0_18px_50px_rgba(15,23,42,0.7)] transition-[opacity,transform] duration-200"
          onKeyDown={step <= 3 ? handleKeyDownAdvance : undefined}
        >
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-slate-50">
                  Let&apos;s build your AI phone agent.
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  This takes about 3 minutes. You&apos;ll hear your agent handle
                  a real call at the end.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="business_name"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Business name
                  </label>
                  <input
                    id="business_name"
                    type="text"
                    value={state.businessName}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        businessName: e.target.value,
                      }))
                    }
                    placeholder="Acme Co"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="business_phone"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Business phone number
                  </label>
                  <input
                    id="business_phone"
                    type="tel"
                    value={state.businessPhone}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        businessPhone: e.target.value,
                      }))
                    }
                    placeholder="(555) 123-4567"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-300">What will your AI do?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {USE_CASE_OPTIONS.map((opt) => {
                    const checked = state.useCases.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-colors ${
                          checked ? "border-sky-400 bg-sky-500/10 text-slate-50" : "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              useCases: e.target.checked
                                ? [...prev.useCases, opt.id]
                                : prev.useCases.filter((u) => u !== opt.id),
                            }))
                          }
                          className="rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="org_type" className="block text-xs font-medium text-slate-300">Type of organization</label>
                <select
                  id="org_type"
                  value={state.orgType ?? ""}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      orgType: (e.target.value || null) as OrgTypeId | null,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Select…</option>
                  {ORG_TYPES.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="industry_opt" className="block text-xs font-medium text-slate-300">Industry (optional — helps us suggest a template)</label>
                <select
                  id="industry_opt"
                  value={state.industry ?? ""}
                  onChange={(e) => {
                    const val = e.target.value as IndustryId | "";
                    setState((prev) => ({
                      ...prev,
                      industry: val || null,
                      services: val ? INDUSTRY_SERVICES[val] : prev.services,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">None / Other</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind.id} value={ind.id}>{ind.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-500">
                  You can change this later in Settings.
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext}
                  className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-xs md:text-sm font-semibold text-black hover:bg-slate-100 disabled:opacity-60"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <Step2Templates
              state={state}
              setState={setState}
              goBack={goBack}
              goNext={goNext}
              canGoNext={canGoNext}
              getIndustryLabel={getIndustryLabel}
            />
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-slate-50">
                    Make it yours
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Tune the basics your callers will hear first.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="agent_name"
                    className="block text-xs font-medium text-slate-300"
                  >
                    Agent name
                  </label>
                  <input
                    id="agent_name"
                    type="text"
                    value={state.agentName}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        agentName: e.target.value,
                      }))
                    }
                    placeholder="Sarah"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="preferred_language" className="block text-xs font-medium text-slate-300">
                    Preferred language
                  </label>
                  <select
                    id="preferred_language"
                    value={state.preferredLanguage}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, preferredLanguage: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">Agent responds in this language and switches if the caller uses another.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="agent_voice" className="block text-xs font-medium text-slate-300">
                    Voice (ElevenLabs)
                  </label>
                  <select
                    id="agent_voice"
                    value={state.elevenlabsVoiceId}
                    onChange={(e) =>
                      setState((prev) => ({ ...prev, elevenlabsVoiceId: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">Default (Rachel)</option>
                    {voices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">Use Preview voice below to hear this voice. Supports all languages.</p>
                </div>
                <div className="space-y-2">
                  <p className="block text-xs font-medium text-slate-300">
                    Key services
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {industryServices.map((svc) => {
                      const isOn = effectiveServices.includes(svc);
                      return (
                        <button
                          key={svc}
                          type="button"
                          onClick={() =>
                            setState((prev) => {
                              const exists = prev.services.includes(svc);
                              const next = exists
                                ? prev.services.filter((s) => s !== svc)
                                : [...prev.services, svc];
                              return { ...prev, services: next };
                            })
                          }
                          className={`rounded-full border px-3 py-1 text-[11px] md:text-xs transition-colors ${
                            isOn
                              ? "border-sky-400 bg-sky-500/10 text-slate-50"
                              : "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          {svc}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-300">
                  Business hours
                </p>
                <div className="grid gap-2">
                  {state.hours.map((slot, idx) => (
                    <div
                      key={slot.day}
                      className="flex items-center gap-3 text-xs text-slate-300"
                    >
                      <div className="w-10 text-slate-400">{slot.day}</div>
                      <button
                        type="button"
                        onClick={() =>
                          setState((prev) => {
                            const next = [...prev.hours];
                            next[idx] = {
                              ...next[idx],
                              enabled: !next[idx].enabled,
                            };
                            return { ...prev, hours: next };
                          })
                        }
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] ${
                          slot.enabled
                            ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                            : "border-slate-700 bg-slate-900/40 text-slate-400"
                        }`}
                      >
                        {slot.enabled ? "Open" : "Closed"}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={slot.start}
                          onChange={(e) =>
                            setState((prev) => {
                              const next = [...prev.hours];
                              next[idx] = {
                                ...next[idx],
                                start: e.target.value,
                              };
                              return { ...prev, hours: next };
                            })
                          }
                          disabled={!slot.enabled}
                          className="rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-[11px] text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        >
                          <option value="09:00">9:00 AM</option>
                          <option value="10:00">10:00 AM</option>
                          <option value="11:00">11:00 AM</option>
                        </select>
                        <span className="text-slate-500">–</span>
                        <select
                          value={slot.end}
                          onChange={(e) =>
                            setState((prev) => {
                              const next = [...prev.hours];
                              next[idx] = {
                                ...next[idx],
                                end: e.target.value,
                              };
                              return { ...prev, hours: next };
                            })
                          }
                          disabled={!slot.enabled}
                          className="rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1 text-[11px] text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        >
                          <option value="17:00">5:00 PM</option>
                          <option value="18:00">6:00 PM</option>
                          <option value="19:00">7:00 PM</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="greeting"
                  className="block text-xs font-medium text-slate-300"
                >
                  Greeting message
                </label>
                <div className="rounded-xl border border-slate-700 bg-slate-900/60">
                  <textarea
                    id="greeting"
                    rows={3}
                    value={state.greeting}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        greeting: e.target.value,
                      }))
                    }
                    className="w-full resize-none rounded-xl bg-transparent px-3 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none"
                    placeholder={`Hi, thanks for calling ${state.businessName || "your business"}. How can I help you today?`}
                  />
                  <div className="flex items-center justify-between px-3 pb-2 text-[11px] text-slate-500">
                    <span>{state.greeting.length} characters</span>
                    <button
                      type="button"
                      className="text-sky-400 hover:text-sky-300"
                      onClick={handlePlayTestGreeting}
                    >
                      Preview voice
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={goBack}
                  className="text-xs md:text-sm text-slate-400 hover:text-slate-100"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext}
                  className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-xs md:text-sm font-semibold text-black hover:bg-slate-100 disabled:opacity-60"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-slate-50">
                  Let&apos;s hear how it sounds
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Your agent is ready for a test drive.
                </p>
              </div>

              <div className="flex flex-col items-center gap-6">
                <button
                  type="button"
                  onClick={handlePlayTestGreeting}
                  className="relative flex h-32 w-32 items-center justify-center rounded-full bg-slate-900/70 border border-sky-500/60 shadow-[0_0_40px_rgba(56,189,248,0.4)]"
                >
                  <div className="absolute inset-0 rounded-full bg-sky-500/10 animate-[pulse_2.4s_ease-out_infinite]" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-slate-900 border border-sky-400">
                    <span className="text-xs font-medium text-slate-50">
                      Tap to listen
                    </span>
                  </div>
                </button>
                <p className="text-xs text-slate-400">
                  Click once and say what a real caller would — your agent will
                  sound just like this.
                </p>
              </div>

              <div className="flex flex-col items-center gap-3 pt-2">
                <p className="text-sm text-slate-300">How did that sound?</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleThumb("down")}
                    className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/40 px-4 py-2 text-xs text-slate-200 hover:border-slate-500"
                  >
                    👎 Adjust settings
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThumb("up")}
                    className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-slate-100"
                  >
                    👍 Looks great! Start answering calls →
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={goBack}
                  className="text-xs md:text-sm text-slate-400 hover:text-slate-100"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <Confetti key="step5-confetti" />
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-slate-50">
                  Your AI agent is live! 🎉
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Your agent is ready to take calls. Complete the steps below to start.
                </p>
              </div>

              <ul className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Business name set</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Phone number added</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Agent template chosen</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Greeting configured</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Ready to forward calls</li>
              </ul>

              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Agent active · Calls will be answered 24/7.</span>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4 space-y-3">
                  <p className="text-sm font-medium text-slate-100">
                    Forward your business number
                  </p>
                  <p className="text-xs text-slate-400">
                    Point your existing line at your agent. You can change this
                    any time.
                  </p>
                  <CarrierInstructions />
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4 space-y-3">
                  <p className="text-sm font-medium text-slate-100">
                    Use a Recall Touch number instead
                  </p>
                  <p className="text-xs text-slate-400">
                    Ideal for tracking or departments. We&apos;ll auto-route calls
                    to your agent.
                  </p>
                  <button
                    type="button"
                    onClick={handleFinalize}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-medium text-slate-200 hover:border-slate-500"
                  >
                    Generate a dedicated number
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="text-xs md:text-sm text-slate-400 hover:text-slate-100"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={(e) => void handleFinalize(e)}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-xs md:text-sm font-semibold text-white hover:bg-emerald-400"
                >
                  Activate Agent →
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Container>
  );
}

function Step2Templates({
  state,
  setState,
  goBack,
  goNext,
  canGoNext,
  getIndustryLabel,
}: {
  state: ActivationState;
  setState: React.Dispatch<React.SetStateAction<ActivationState>>;
  goBack: () => void;
  goNext: () => void;
  canGoNext: boolean;
  getIndustryLabel: (id: IndustryId | null) => string;
}) {
  const [category, setCategory] = useState<AgentTemplateCategory | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = category === "all" ? AGENT_TEMPLATES : AGENT_TEMPLATES.filter((t) => t.category === category);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.styleLabel.toLowerCase().includes(q));
    return list;
  }, [category, search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-50">Pick a starting template</h2>
        <p className="mt-1 text-sm text-slate-400">We&apos;ll tune the script for {getIndustryLabel(state.industry).toLowerCase()}.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${category === "all" ? "border-sky-400 bg-sky-500/10 text-slate-50" : "border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500"}`}
        >
          All
        </button>
        {AGENT_TEMPLATE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${category === c.id ? "border-sky-400 bg-sky-500/10 text-slate-50" : "border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder="Search templates..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        aria-label="Search templates"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-h-[50vh] overflow-y-auto pr-2">
        {filtered.map((t) => {
          const isSelected = state.agentTemplate === t.id;
          const initials = t.name.replace(/^The\s+/, "").slice(0, 2).toUpperCase();
          return (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  agentTemplate: t.id,
                  agentName: prev.agentName || t.name.replace(/^The\s+/, ""),
                  greeting: t.defaultGreeting,
                }))
              }
              className={`flex flex-col items-start gap-2 rounded-2xl border px-4 py-4 text-left text-sm transition-colors ${
                isSelected ? "border-sky-400 bg-sky-500/10" : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
              }`}
            >
              <div className="flex items-center gap-3 w-full min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-50 border border-slate-600">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-50 truncate">{t.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{t.styleLabel}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{t.description}</p>
              <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                {t.behaviors.map((b) => (
                  <li key={b} className="flex items-start gap-1.5">
                    <span className="mt-[3px] h-1 w-1 rounded-full bg-sky-400 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-slate-500 mt-1">Best for: {t.bestFor}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  previewVoiceViaApi(t.defaultGreeting, "female");
                }}
                className="text-[11px] text-sky-400 hover:text-sky-300 mt-1"
              >
                Preview voice ▶
              </button>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() =>
            setState((prev) => ({
              ...prev,
              agentTemplate: "scratch",
              agentName: prev.agentName || "Agent",
              greeting: `Hi, thanks for calling ${prev.businessName || "your business"}. How can I help you today?`,
            }))
          }
          className={`flex flex-col justify-center gap-2 rounded-2xl border px-4 py-4 text-left text-sm transition-colors ${
            state.agentTemplate === "scratch" ? "border-sky-400 bg-sky-500/10" : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
          }`}
        >
          <p className="text-sm font-semibold text-slate-50">Start from scratch</p>
          <p className="text-xs text-slate-400">Minimal script, no assumptions. Callers are still protected and decisions captured.</p>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button type="button" onClick={goBack} className="text-xs md:text-sm text-slate-400 hover:text-slate-100">← Back</button>
        <button type="button" onClick={goNext} disabled={!canGoNext} className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-xs md:text-sm font-semibold text-black hover:bg-slate-100 disabled:opacity-60">Next →</button>
      </div>
    </div>
  );
}

function CarrierInstructions() {
  const [carrier, setCarrier] = useState<"att" | "verizon" | "tmobile" | "other">(
    "att",
  );

  let code: string;
  if (carrier === "att") code = "*21*[your Recall Touch number]#";
  else if (carrier === "verizon") code = "*72[your Recall Touch number]";
  else if (carrier === "tmobile") code = "**21*[your Recall Touch number]#";
  else code = "Set conditional call forwarding to your Recall Touch number.";

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-slate-300">
        Carrier
      </label>
      <div className="flex flex-wrap gap-2 text-[11px]">
        {[
          { id: "att", label: "AT&T" },
          { id: "verizon", label: "Verizon" },
          { id: "tmobile", label: "T-Mobile" },
          { id: "other", label: "Other" },
        ].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() =>
              setCarrier(c.id as "att" | "verizon" | "tmobile" | "other")
            }
            className={`rounded-full border px-3 py-1 ${
              carrier === c.id
                ? "border-sky-400 bg-sky-500/10 text-slate-50"
                : "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-500"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300">
        <p className="font-medium mb-1">Forwarding code</p>
        <p className="font-mono text-xs">{code}</p>
        <p className="mt-1 text-[10px] text-slate-500">
          Dial this from your business phone, then press call. We&apos;ll detect
          the first forwarded call automatically.
        </p>
      </div>
    </div>
  );
}

