"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CampaignType = "follow_up" | "reminder" | "reactivation" | "review" | "custom";
type CampaignStatus = "Active" | "Paused" | "Draft";

type AudienceMode = "all" | "tagged" | "pasted";

type Campaign = {
  id: string;
  name: string;
  type: CampaignType;
  agentName: string;
  status: CampaignStatus;
  sent: number;
  total: number;
  dateRange: string;
  audienceSummary: string;
  scheduleSummary: string;
};

const STORAGE_KEY = "rt_campaigns";

function loadCampaigns(): Campaign[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Campaign[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCampaigns(next: Campaign[]) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function statusClasses(status: CampaignStatus) {
  if (status === "Active") return "bg-green-500/15 text-green-400";
  if (status === "Paused") return "bg-amber-500/15 text-amber-400";
  return "bg-zinc-800 text-zinc-400";
}

export default function AppCampaignsPage() {
  const initialCampaigns =
    typeof window === "undefined" ? [] : loadCampaigns();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCampaigns[0]?.id ?? null,
  );
  const [open, setOpen] = useState(false);
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("all");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<CampaignType>("follow_up");
  const [formAgent, setFormAgent] = useState("Receptionist");
  const [formTag, setFormTag] = useState("");
  const [formPasted, setFormPasted] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formWindowStart, setFormWindowStart] = useState("09:00");
  const [formWindowEnd, setFormWindowEnd] = useState("17:00");
  const [formDays, setFormDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [formMaxPerDay, setFormMaxPerDay] = useState(25);
  const [launchAsActive, setLaunchAsActive] = useState(true);
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const selected = useMemo(
    () => (selectedId ? campaigns.find((c) => c.id === selectedId) ?? null : null),
    [campaigns, selectedId],
  );

  const resetForm = () => {
    setFormName("");
    setFormType("follow_up");
    setFormAgent("Receptionist");
    setAudienceMode("all");
    setFormTag("");
    setFormPasted("");
    setFormStartDate("");
    setFormWindowStart("09:00");
    setFormWindowEnd("17:00");
    setFormDays(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    setFormMaxPerDay(25);
    setLaunchAsActive(true);
    setStep(1);
  };

  const toggleDay = (day: string) => {
    setFormDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(
        (a, b) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(a) - ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(b),
      ),
    );
  };

  const typeLabel = (t: CampaignType) => {
    if (t === "follow_up") return "Follow-up";
    if (t === "reminder") return "Reminder";
    if (t === "reactivation") return "Reactivation";
    if (t === "review") return "Review";
    return "Custom";
  };

  const handleCreate = (asDraft: boolean) => {
    const id = `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const status: CampaignStatus = asDraft ? "Draft" : "Active";
    const dateRange = formStartDate ? new Date(formStartDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Scheduled";
    const audienceSummary =
      audienceMode === "all"
        ? "All contacts"
        : audienceMode === "tagged"
          ? formTag
            ? `Contacts tagged “${formTag.trim()}”`
            : "Tagged contacts"
          : "Pasted numbers";
    const scheduleSummary = `${formDays.join(", ")} · ${formWindowStart}–${formWindowEnd} · max ${formMaxPerDay}/day`;

    const campaign: Campaign = {
      id,
      name: formName.trim() || typeLabel(formType),
      type: formType,
      agentName: formAgent.trim() || "Receptionist",
      status,
      sent: 0,
      total: 0,
      dateRange,
      audienceSummary,
      scheduleSummary,
    };

    const next = [campaign, ...campaigns];
    setCampaigns(next);
    setSelectedId(campaign.id);
    saveCampaigns(next);
    setOpen(false);
    setToast(asDraft ? "Draft saved" : "Run started");
  };

  const total = campaigns.length;

  return (
    <div className="relative max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-white">Outbound calls</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Scheduled outbound calls so no lead, reminder, or review is missed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          className="hidden sm:inline-flex items-center gap-1.5 bg-white text-black font-semibold rounded-xl px-4 py-2 text-sm hover:bg-zinc-100"
        >
          + New outbound run
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
        className="sm:hidden mb-4 w-full bg-white text-black font-semibold rounded-xl px-4 py-2 text-sm hover:bg-zinc-100"
      >
        + New outbound run
      </button>

      {total === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 py-10 px-6 text-center">
          <p className="text-sm text-zinc-300 mb-1">No outbound runs yet.</p>
          <p className="text-xs text-zinc-500 mb-4">
            Use outbound runs for structured follow-up, reminders, reactivation, or review requests.
          </p>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-white text-black font-semibold rounded-xl px-4 py-2 text-sm hover:bg-zinc-100"
          >
            + New Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)] gap-4 lg:gap-6 items-start">
          <ul className="space-y-3">
            {campaigns.map((c) => {
              const pct = c.total > 0 ? Math.round((c.sent / c.total) * 100) : 0;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-4 rounded-2xl border bg-zinc-900/50 hover:bg-zinc-900 transition-colors ${
                      selected?.id === c.id ? "border-zinc-500" : "border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="font-medium text-sm text-white truncate">{c.name}</p>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusClasses(c.status)}`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mb-1">
                      Type: {typeLabel(c.type)} · Agent: {c.agentName}
                    </p>
                    <p className="text-[11px] text-zinc-500 mb-2">
                      {c.dateRange} · {c.audienceSummary}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          {c.sent}/{c.total || "—"} calls · {c.scheduleSummary}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-5 text-xs md:text-sm">
            {selected ? (
              <>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-white">{selected.name}</h2>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {typeLabel(selected.type)} · {selected.dateRange}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.status === "Active" && (
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl border border-zinc-700 text-[11px] text-zinc-300 hover:border-zinc-500"
                      >
                        Pause
                      </button>
                    )}
                    {selected.status !== "Active" && (
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl border border-zinc-700 text-[11px] text-zinc-300 hover:border-zinc-500"
                      >
                        Resume
                      </button>
                    )}
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl border border-zinc-700 text-[11px] text-zinc-300 hover:border-zinc-500"
                    >
                      Stop
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/70">
                    <p className="text-[11px] text-zinc-500 mb-1">Progress</p>
                    <p className="text-sm text-white">
                      {selected.sent}/{selected.total || "—"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/70">
                    <p className="text-[11px] text-zinc-500 mb-1">Status</p>
                    <p className="text-sm text-white">{selected.status}</p>
                  </div>
                </div>
                <div className="mb-4">
                  <h3 className="text-[11px] font-semibold text-zinc-400 mb-1.5">
                    Audience
                  </h3>
                  <p className="text-xs text-zinc-300">{selected.audienceSummary}</p>
                </div>
                <div className="mb-4">
                  <h3 className="text-[11px] font-semibold text-zinc-400 mb-1.5">
                    Schedule
                  </h3>
                  <p className="text-xs text-zinc-300">{selected.scheduleSummary}</p>
                </div>
                <div>
                  <h3 className="text-[11px] font-semibold text-zinc-400 mb-1.5">
                    Call log (demo)
                  </h3>
                  <p className="text-xs text-zinc-500">
                    This demo view shows summary only. In production, you&apos;ll see per-call outcomes.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                Select a run to see its schedule, audience, and progress.
              </p>
            )}
          </div>
        </div>
      )}

      <p className="mt-6">
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">
          ← Activity
        </Link>
      </p>

      {toast && (
        <div className="fixed bottom-4 right-4 z-40 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 shadow-lg">
          {toast}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold text-white mb-1">New outbound run</h2>
            <p className="text-xs text-zinc-500 mb-4">
              4 quick steps: basics, audience, schedule, and review.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mb-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="flex items-center gap-1">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      step >= n ? "bg-white text-black" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {n}
                  </div>
                  {n < 4 && <div className="w-6 h-[1px] bg-zinc-700" />}
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-3 text-xs md:text-sm">
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                    placeholder="New Lead Follow-up"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">Type</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as CampaignType)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 focus:outline-none"
                    >
                      <option value="follow_up">Follow-up</option>
                      <option value="reminder">Reminder</option>
                      <option value="reactivation">Reactivation</option>
                      <option value="review">Review</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">Agent</label>
                    <input
                      type="text"
                      value={formAgent}
                      onChange={(e) => setFormAgent(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                      placeholder="Receptionist, Follow-Up, After-Hours…"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3 text-xs md:text-sm">
                <p className="text-[11px] text-zinc-500">Audience</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="radio"
                      checked={audienceMode === "all"}
                      onChange={() => setAudienceMode("all")}
                      className="accent-white"
                    />
                    All contacts
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="radio"
                      checked={audienceMode === "tagged"}
                      onChange={() => setAudienceMode("tagged")}
                      className="accent-white"
                    />
                    Tagged
                  </label>
                  {audienceMode === "tagged" && (
                    <input
                      type="text"
                      value={formTag}
                      onChange={(e) => setFormTag(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                      placeholder="e.g., plumbing, overdue, VIP"
                    />
                  )}
                  <label className="flex items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="radio"
                      checked={audienceMode === "pasted"}
                      onChange={() => setAudienceMode("pasted")}
                      className="accent-white"
                    />
                    Paste numbers
                  </label>
                  {audienceMode === "pasted" && (
                    <textarea
                      rows={3}
                      value={formPasted}
                      onChange={(e) => setFormPasted(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none resize-none"
                      placeholder="+1 503 555 0199, one per line or comma-separated"
                    />
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 text-xs md:text-sm">
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Start date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:border-zinc-600 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-[1.1fr_1.1fr] gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">Time window</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={formWindowStart}
                        onChange={(e) => setFormWindowStart(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:border-zinc-600 focus:outline-none"
                      />
                      <span className="text-[11px] text-zinc-500">to</span>
                      <input
                        type="time"
                        value={formWindowEnd}
                        onChange={(e) => setFormWindowEnd(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:border-zinc-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">Max per day</label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={formMaxPerDay}
                      onChange={(e) =>
                        setFormMaxPerDay(Number(e.target.value || 0) || formMaxPerDay)
                      }
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:border-zinc-600 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <p className="block text-[11px] text-zinc-500 mb-2">Days</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`px-2.5 py-1.5 rounded-full text-[11px] ${
                          formDays.includes(d)
                            ? "bg-white text-black"
                            : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3 text-xs md:text-sm">
                <p className="text-[11px] text-zinc-500">Review</p>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
                  <div>
                    <p className="text-[11px] text-zinc-500 mb-0.5">Basics</p>
                    <p className="text-xs text-zinc-200">
                      {formName.trim() || typeLabel(formType)} · {typeLabel(formType)} · Agent:{" "}
                      {formAgent || "Receptionist"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500 mb-0.5">Audience</p>
                    <p className="text-xs text-zinc-200">
                      {audienceMode === "all"
                        ? "All contacts"
                        : audienceMode === "tagged"
                          ? formTag
                            ? `Contacts tagged “${formTag.trim()}”`
                            : "Tagged contacts"
                          : "Pasted numbers"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500 mb-0.5">Schedule</p>
                    <p className="text-xs text-zinc-200">
                      {formStartDate
                        ? new Date(formStartDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : "Starting soon"}
                      {" · "}
                      {formDays.join(", ")} · {formWindowStart}–{formWindowEnd} · max{" "}
                      {formMaxPerDay}/day
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                  <input
                    id="launch-active"
                    type="checkbox"
                    checked={launchAsActive}
                    onChange={(e) => setLaunchAsActive(e.target.checked)}
                    className="accent-white"
                  />
                  <label htmlFor="launch-active" className="text-[11px] text-zinc-300">
                    Start as active (can pause anytime)
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 mt-5 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:border-zinc-500"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(1, s - 1))}
                    className="px-3 py-2 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:border-zinc-500"
                  >
                    Back
                  </button>
                )}
                {step < 4 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(4, s + 1))}
                    className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100"
                  >
                    Next
                  </button>
                )}
                {step === 4 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCreate(true)}
                      className="px-3 py-2 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:border-zinc-500"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreate(!launchAsActive ? true : false)}
                      className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-100"
                    >
                      {launchAsActive ? "Start run" : "Create Draft"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

