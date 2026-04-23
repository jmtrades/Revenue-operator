"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { cn } from "@/lib/cn";
import { track } from "@/lib/analytics/posthog";
import {
  ArrowLeft,
  ChevronRight,
  Check,
  Zap,
  ClipboardCheck,
  CalendarClock,
  RefreshCw,
  FileText,
  Star,
  Snowflake,
  Megaphone,
  Calendar,
  SlidersHorizontal,
} from "lucide-react";

type CampaignType =
  | "speed_to_lead"
  | "lead_qualification"
  | "appointment_setting"
  | "no_show_recovery"
  | "reactivation"
  | "quote_chase"
  | "review_request"
  | "cold_outreach"
  | "appointment_reminder"
  | "custom";

type StepChannel = "sms" | "call" | "email";

type SequenceStep = {
  channel: StepChannel;
  delayHours: number;
  template: string;
};

const getCampaignTypes = (t: (key: string, opts?: { defaultValue?: string }) => string): Array<{
  id: CampaignType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}> => [
  { id: "speed_to_lead", icon: Zap, label: t("types.speedToLead.label", { defaultValue: "Speed-to-Lead" }), description: t("types.speedToLead.desc", { defaultValue: "Text in 5 minutes, call if no reply." }) },
  { id: "lead_qualification", icon: ClipboardCheck, label: t("types.leadQualification.label", { defaultValue: "Lead Qualification" }), description: t("types.leadQualification.desc", { defaultValue: "Qualify interest and book the next step." }) },
  { id: "appointment_setting", icon: CalendarClock, label: t("types.appointmentSetting.label", { defaultValue: "Appointment Setting" }), description: t("types.appointmentSetting.desc", { defaultValue: "Call and text until an appointment is set." }) },
  { id: "appointment_reminder", icon: Calendar, label: t("types.appointmentReminder.label", { defaultValue: "Appointment Reminder" }), description: t("types.appointmentReminder.desc", { defaultValue: "24h and 1h reminders to reduce no-shows." }) },
  { id: "no_show_recovery", icon: RefreshCw, label: t("types.noShowRecovery.label", { defaultValue: "No-Show Recovery" }), description: t("types.noShowRecovery.desc", { defaultValue: "Recover missed appointments with follow-up." }) },
  { id: "reactivation", icon: Snowflake, label: t("types.reactivation.label", { defaultValue: "Reactivation" }), description: t("types.reactivation.desc", { defaultValue: "Re-engage inactive contacts." }) },
  { id: "quote_chase", icon: FileText, label: t("types.quoteChase.label", { defaultValue: "Quote Chase" }), description: t("types.quoteChase.desc", { defaultValue: "Follow up on pending quotes." }) },
  { id: "review_request", icon: Star, label: t("types.reviewRequest.label", { defaultValue: "Review Request" }), description: t("types.reviewRequest.desc", { defaultValue: "Request a review after completion." }) },
  { id: "cold_outreach", icon: Megaphone, label: t("types.coldOutreach.label", { defaultValue: "Cold Outreach" }), description: t("types.coldOutreach.desc", { defaultValue: "Reach a list with a controlled cadence." }) },
  { id: "custom", icon: SlidersHorizontal, label: t("types.custom.label", { defaultValue: "Custom" }), description: t("types.custom.desc", { defaultValue: "Build your own sequence." }) },
];

const DEFAULT_TEMPLATES: Record<CampaignType, SequenceStep[]> = {
  speed_to_lead: [
    { channel: "sms", delayHours: 0, template: "Hi {firstName}, thanks for calling {businessName}. Want to schedule a time?" },
    { channel: "call", delayHours: 0.25, template: "Outbound call to follow up and book." },
    { channel: "sms", delayHours: 2, template: "Still interested? We have availability this week. Reply YES to book." },
  ],
  lead_qualification: [
    { channel: "call", delayHours: 0, template: "Outbound call to qualify and book." },
    { channel: "sms", delayHours: 24, template: "Quick follow-up: do you want to schedule a time to talk?" },
  ],
  appointment_setting: [
    { channel: "call", delayHours: 0, template: "Call to schedule an appointment." },
    { channel: "sms", delayHours: 48, template: "We can get you on the calendar this week. What day works best?" },
  ],
  appointment_reminder: [
    { channel: "sms", delayHours: 0, template: "Reminder: your appointment is tomorrow at {appointmentDate}." },
    { channel: "sms", delayHours: 23, template: "Your appointment is in 1 hour. Reply R to reschedule." },
  ],
  no_show_recovery: [
    { channel: "sms", delayHours: 0.5, template: "We missed you today. Want to reschedule? Reply YES and we’ll find a time." },
    { channel: "call", delayHours: 2, template: "Call to reschedule the missed appointment." },
    { channel: "sms", delayHours: 24, template: "Still want to get back on the schedule? Reply YES." },
  ],
  reactivation: [
    { channel: "sms", delayHours: 0, template: "Hi {firstName} — want to get back on the schedule this week?" },
    { channel: "call", delayHours: 72, template: "Call to re-engage and book." },
    { channel: "sms", delayHours: 168, template: "Last note — we can help whenever you’re ready." },
  ],
  quote_chase: [
    { channel: "sms", delayHours: 72, template: "Checking in on your quote. Want to move forward this week?" },
    { channel: "call", delayHours: 120, template: "Call to answer questions and close." },
  ],
  review_request: [
    { channel: "sms", delayHours: 3, template: "Thanks again for choosing {businessName}. Would you leave a quick review? {reviewLink}" },
  ],
  cold_outreach: [
    { channel: "call", delayHours: 0, template: "Call to introduce and qualify interest." },
    { channel: "sms", delayHours: 24, template: "Quick follow-up — want to schedule a time to talk?" },
  ],
  custom: [{ channel: "sms", delayHours: 0, template: "Hi {firstName}…" }],
};

type WizardStep = 1 | 2 | 3 | 4 | 5;

export default function CampaignCreatePage() {
  const t = useTranslations("campaigns.create");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const effectiveWorkspaceId = workspaceId || workspaceSnapshot?.id?.trim() || null;

  const [step, setStep] = useState<WizardStep>(1);
  const [type, setType] = useState<CampaignType>("speed_to_lead");
  const [name, setName] = useState("Speed-to-Lead");

  // Audience filters (stored into target_filter)
  const [statuses, setStatuses] = useState<string[]>(["New", "Contacted"]);
  const [source, setSource] = useState<string>("");
  const [minScore, setMinScore] = useState<number | "">("");
  const [notContactedDays, setNotContactedDays] = useState<number | "">("");

  // Sequence
  const [sequence, setSequence] = useState<SequenceStep[]>(DEFAULT_TEMPLATES.speed_to_lead);

  // Schedule
  const [startAt, setStartAt] = useState<string>("");
  const [hoursOnly, setHoursOnly] = useState(true);
  const [dailyLimit, setDailyLimit] = useState<number | "">(50);
  const [hourlyThrottle, setHourlyThrottle] = useState<number | "">(10);
  const [optOutConfirmed, setOptOutConfirmed] = useState(false);

  const [_saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmLaunch, setConfirmLaunch] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const campaignTypes = useMemo(() => getCampaignTypes(t), [t]);

  // Smart defaults: auto-populate audience, name, and schedule based on campaign type
  useEffect(() => {
    setSequence(DEFAULT_TEMPLATES[type]);
    const typeLabels: Record<CampaignType, string> = {
      speed_to_lead: "Speed-to-Lead",
      lead_qualification: "Lead Qualification",
      appointment_setting: "Appointment Setting",
      appointment_reminder: "Appointment Reminder",
      no_show_recovery: "No-Show Recovery",
      reactivation: "Reactivation",
      quote_chase: "Quote Chase",
      review_request: "Review Request",
      cold_outreach: "Cold Outreach",
      custom: "Custom Campaign",
    };
    setName(typeLabels[type] || "Custom Campaign");

    // Smart audience defaults per type
    const typeDefaults: Record<CampaignType, { statuses: string[]; notContactedDays: number | "" }> = {
      speed_to_lead: { statuses: ["New"], notContactedDays: "" },
      lead_qualification: { statuses: ["New", "Contacted"], notContactedDays: "" },
      appointment_setting: { statuses: ["Contacted", "Engaged", "Qualified"], notContactedDays: "" },
      appointment_reminder: { statuses: ["Booked"], notContactedDays: "" },
      no_show_recovery: { statuses: ["Booked", "Showed"], notContactedDays: "" },
      reactivation: { statuses: ["Contacted", "Engaged"], notContactedDays: 30 },
      quote_chase: { statuses: ["Qualified"], notContactedDays: 3 },
      review_request: { statuses: ["Won"], notContactedDays: "" },
      cold_outreach: { statuses: ["New"], notContactedDays: "" },
      custom: { statuses: ["New", "Contacted"], notContactedDays: "" },
    };
    const defaults = typeDefaults[type];
    if (defaults) {
      setStatuses(defaults.statuses);
      if (defaults.notContactedDays !== "") setNotContactedDays(defaults.notContactedDays);
    }
  }, [type]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const steps = useMemo(
    () => [
      { id: 1 as const, label: t("steps.type") },
      { id: 2 as const, label: t("steps.audience") },
      { id: 3 as const, label: t("steps.sequence") },
      { id: 4 as const, label: t("steps.schedule") },
      { id: 5 as const, label: t("steps.review") },
    ],
    [t],
  );

  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(type);
    if (step === 2) return true;
    if (step === 3) return sequence.length > 0 && sequence.every((s) => s.template.trim().length > 0);
    if (step === 4) return optOutConfirmed;
    return true;
  }, [optOutConfirmed, sequence, step, type]);

  const targetFilter = useMemo(() => {
    const tf: Record<string, unknown> = {};
    if (statuses.length) tf.audience_statuses = statuses;
    if (source) tf.audience_source = source;
    if (typeof minScore === "number") tf.audience_min_score = minScore;
    if (typeof notContactedDays === "number") tf.audience_not_contacted_days = notContactedDays;
    tf.sequence = sequence.map((s) => ({ channel: s.channel, delay_hours: s.delayHours, template: s.template }));
    tf.schedule = { start_at: startAt || null, business_hours_only: hoursOnly, daily_limit: dailyLimit, hourly_throttle: hourlyThrottle };
    return tf;
  }, [dailyLimit, hourlyThrottle, hoursOnly, minScore, notContactedDays, sequence, source, startAt, statuses]);

  const inferredName = useMemo(() => {
    const base = campaignTypes.find((x) => x.id === type)?.label ?? "Campaign";
    return `${base} — ${new Date().toLocaleDateString()}`;
  }, [type, campaignTypes]);

  const createCampaign = async (launch: boolean) => {
    // Validate templates aren't empty
    if (sequence.some((s) => !s.template.trim())) {
      setToast(t("errors.emptyTemplate", { defaultValue: "At least one message template is required." }));
      return;
    }
    if (!effectiveWorkspaceId) {
      setToast(t("errors.noWorkspace"));
      return;
    }
    setSaving(true);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/campaigns`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: effectiveWorkspaceId,
          name: (name || inferredName).trim(),
          type,
          target_filter: targetFilter,
        }),
      });
      const created = (await res.json().catch(() => null)) as { campaign?: { id?: string }; id?: string; error?: string } | null;
      const campaignId = created?.campaign?.id ?? created?.id;
      if (!res.ok || !campaignId) {
        setToast(created?.error || t("errors.createFailed"));
        return;
      }
      track("campaign_created", { type });
      if (launch) {
        const launchRes = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/launch`, {
          method: "POST",
          credentials: "include",
        });
        const launchJson = launchRes.ok ? await launchRes.json().catch(() => null) : null;
        if (!launchRes.ok || !launchJson) {
          setToast(t("toast.createdButLaunchFailed"));
          router.push("/app/campaigns");
          return;
        }
        const contacts = typeof (launchJson as { enqueued?: unknown } | null)?.enqueued === "number" ? (launchJson as { enqueued?: number }).enqueued : 0;
        track("campaign_launched", { contacts });
      }
      setToast(launch ? t("toast.launched") : t("toast.saved"));
      router.push("/app/campaigns");
    } catch {
      setToast(t("errors.createFailed", { defaultValue: "Could not create campaign. Check your settings and try again." }));
    } finally {
      setSaving(false);
      setSubmitting(false);
      setConfirmLaunch(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <Link
            href="/app/campaigns"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Link>
          <h1 className="mt-3 text-xl md:text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">
            {t("title")}
          </h1>
          <p className="mt-1.5 text-[13px] text-[var(--text-secondary)] leading-relaxed">
            {t("subtitle")}
          </p>
        </div>
        <Link
          href="/app/campaigns"
          className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
        >
          {tCommon("cancel")}
        </Link>
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {steps.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
                step === s.id
                  ? "border-[var(--border-medium)] bg-[var(--bg-input)] text-[var(--text-primary)]"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                  step > s.id ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "bg-[var(--bg-input)] text-[var(--text-secondary)]",
                )}
              >
                {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
              </span>
              {s.label}
              {s.id !== 5 ? <ChevronRight className="h-3.5 w-3.5 opacity-40" /> : null}
            </button>
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{t("type.heading")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {campaignTypes.map((ct) => {
                const Icon = ct.icon;
                const selected = ct.id === type;
                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setType(ct.id)}
                    className={cn(
                      "text-left rounded-2xl border p-4 transition",
                      selected
                        ? "border-[var(--border-medium)] bg-[var(--bg-input)]"
                        : "border-[var(--border-default)] hover:bg-[var(--bg-hover)]",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] flex items-center justify-center">
                        <Icon className="h-5 w-5 text-[var(--text-primary)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{ct.label}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{ct.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                {t("type.nameLabel")}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={inferredName}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-medium)]"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("audience.heading")}</h2>
            <p className="text-xs text-[var(--text-secondary)]">{t("audience.subtext")}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">{t("audience.statusLabel")}</label>
                <div className="flex flex-wrap gap-2">
                  {["New", "Contacted", "Qualified", "Appointment Set", "Won", "Lost"].map((s) => {
                    const active = statuses.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setStatuses((prev) => (active ? prev.filter((x) => x !== s) : [...prev, s]))
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs",
                          active
                            ? "border-[var(--border-medium)] bg-[var(--bg-input)] text-[var(--text-primary)]"
                            : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">{t("audience.sourceLabel")}</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
                >
                  <option value="">{t("audience.sourceAny")}</option>
                  <option value="inbound_call">{t("audience.sourceInbound")}</option>
                  <option value="outbound">{t("audience.sourceOutbound")}</option>
                  <option value="website">{t("audience.sourceWebsite")}</option>
                  <option value="referral">{t("audience.sourceReferral")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">{t("audience.minScoreLabel")}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value ? Number(e.target.value) : "")}
                  placeholder={t("audience.minScorePlaceholder")}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">{t("audience.notContactedLabel")}</label>
                <input
                  type="number"
                  min={1}
                  value={notContactedDays}
                  onChange={(e) => setNotContactedDays(e.target.value ? Number(e.target.value) : "")}
                  placeholder={t("audience.notContactedPlaceholder")}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
                />
              </div>
            </div>

            {type === "cold_outreach" && (
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-input)] p-4 text-xs text-[var(--text-secondary)]">
                {t("audience.csvHint")}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("sequence.heading")}</h2>
            <p className="text-xs text-[var(--text-secondary)]">{t("sequence.subtext")}</p>

            <div className="space-y-3">
              {sequence.map((s, idx) => (
                <div key={idx} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-input)] p-4">
                  <div className="grid grid-cols-1 md:grid-cols-[160px_140px_1fr] gap-3 items-start">
                    <div>
                      <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">{t("sequence.channel")}</label>
                      <select
                        value={s.channel}
                        onChange={(e) =>
                          setSequence((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, channel: e.target.value as StepChannel } : x)),
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
                      >
                        <option value="sms">{t("sequence.sms")}</option>
                        <option value="call">{t("sequence.call")}</option>
                        <option value="email">{t("sequence.email")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">{t("sequence.delayHours")}</label>
                      <input
                        type="number"
                        min={0}
                        step={0.25}
                        value={s.delayHours}
                        onChange={(e) =>
                          setSequence((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, delayHours: Number(e.target.value) } : x)),
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">{t("sequence.template")}</label>
                      <textarea
                        value={s.template}
                        onChange={(e) =>
                          setSequence((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, template: e.target.value } : x)),
                          )
                        }
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] resize-none"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {["{firstName}", "{businessName}", "{appointmentDate}", "{serviceName}"].map((token) => (
                          <button
                            key={token}
                            type="button"
                            onClick={() =>
                              setSequence((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, template: `${x.template}${x.template.endsWith(" ") || !x.template ? "" : " "}${token}` } : x)),
                              )
                            }
                            className="text-[11px] rounded-full border border-[var(--border-default)] px-2 py-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                          >
                            {token}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSequence((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      disabled={sequence.length <= 1}
                    >
                      {t("sequence.remove")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSequence((prev) => [...prev, { channel: "sms", delayHours: 24, template: "" }])}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              {t("sequence.addStep")}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("schedule.heading")}</h2>
            <p className="text-xs text-[var(--text-secondary)]">{t("schedule.subtext")}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">{t("schedule.startAt")}</label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">{t("schedule.dailyLimit")}</label>
                <input
                  type="number"
                  min={0}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">{t("schedule.hourlyThrottle")}</label>
                <input
                  type="number"
                  min={1}
                  value={hourlyThrottle}
                  onChange={(e) => setHourlyThrottle(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
                />
              </div>
              <div className="flex items-center gap-3 pt-7">
                <input
                  id="hoursOnly"
                  type="checkbox"
                  checked={hoursOnly}
                  onChange={(e) => setHoursOnly(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="hoursOnly" className="text-sm text-[var(--text-secondary)]">
                  {t("schedule.businessHours")}
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-input)] p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={optOutConfirmed}
                  onChange={(e) => setOptOutConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  {t("schedule.optOutConfirm")}
                </span>
              </label>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("review.heading")}</h2>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-input)] p-4 text-sm text-[var(--text-secondary)] space-y-2">
              <p><span className="text-[var(--text-tertiary)]">{t("review.name")}:</span> <span className="text-[var(--text-primary)] font-medium">{(name || inferredName).trim()}</span></p>
              <p><span className="text-[var(--text-tertiary)]">{t("review.type")}:</span> <span className="text-[var(--text-primary)] font-medium">{campaignTypes.find((x) => x.id === type)?.label}</span></p>
              <p><span className="text-[var(--text-tertiary)]">{t("review.steps")}:</span> <span className="text-[var(--text-primary)] font-medium">{sequence.length}</span></p>
              <p><span className="text-[var(--text-tertiary)]">{t("review.schedule")}:</span> <span className="text-[var(--text-primary)] font-medium">{hoursOnly ? t("review.hoursOn") : t("review.hoursOff")}</span></p>
              <p className="text-[11px] text-[var(--text-tertiary)]">{t("review.note")}</p>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s))}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold border",
              step === 1
                ? "border-[var(--border-default)] text-[var(--text-tertiary)] cursor-not-allowed"
                : "border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
            )}
            disabled={step === 1}
          >
            {tCommon("back")}
          </button>

          <div className="flex items-center gap-2">
            {step < 5 ? (
              <button
                type="button"
                onClick={() => canContinue && setStep((s) => ((s + 1) as WizardStep))}
                className={cn(
                  "rounded-xl px-5 py-2 text-sm font-semibold",
                  canContinue
                    ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90"
                    : "bg-[var(--bg-input)] text-[var(--text-tertiary)] cursor-not-allowed",
                )}
                disabled={!canContinue}
              >
                {tCommon("continue")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void createCampaign(false)}
                  className={cn(
                    "rounded-xl px-5 py-2 text-sm font-semibold border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                    submitting ? "opacity-60 cursor-not-allowed" : "",
                  )}
                  disabled={submitting}
                >
                  {submitting ? t("review.saving") : t("review.saveDraft")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmLaunch(true)}
                  className={cn(
                    "rounded-xl px-5 py-2 text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90",
                    submitting ? "opacity-60 cursor-not-allowed" : "",
                  )}
                  disabled={submitting}
                >
                  {submitting ? t("review.launching") : t("review.launch")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {confirmLaunch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 max-w-sm shadow-lg">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              {t("review.confirmLaunch", { defaultValue: "Launch campaign?" })}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {t("review.confirmLaunchDesc", { defaultValue: "This will start sending immediately to all matched contacts." })}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmLaunch(false)}
                className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="button"
                onClick={() => void createCampaign(true)}
                className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90"
                disabled={submitting}
              >
                {submitting ? t("review.launching") : t("review.confirm", { defaultValue: "Confirm" })}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-primary)] shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

