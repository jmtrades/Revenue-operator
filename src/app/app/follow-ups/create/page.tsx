"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { track } from "@/lib/analytics/posthog";

type StepChannel = "sms" | "call" | "email";
type Trigger =
  | "call_outcome:lead_captured"
  | "call_outcome:voicemail_left"
  | "call_outcome:no_answer"
  | "call_outcome:booked"
  | "booking_status:confirmed"
  | "booking_status:no_show"
  | "booking_status:completed"
  | "manual";

type Step = {
  channel: StepChannel;
  delayAmount: number;
  delayUnit: "minutes" | "hours" | "days";
  template: string;
  stopIfReply: boolean;
  stopIfBooked: boolean;
};

const DEFAULT_STEP: Step = {
  channel: "sms",
  delayAmount: 0,
  delayUnit: "hours",
  template: "Hi {firstName} — following up on your call with {businessName}.",
  stopIfReply: true,
  stopIfBooked: true,
};

function toMinutes(step: Step) {
  const amount = Math.max(0, Number(step.delayAmount || 0));
  if (step.delayUnit === "minutes") return amount;
  if (step.delayUnit === "hours") return amount * 60;
  return amount * 60 * 24;
}

export default function FollowUpCreatePage() {
  const t = useTranslations("followUps.createPage");
  const tToast = useTranslations("toast");
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const effectiveWorkspaceId = workspaceId || workspaceSnapshot?.id?.trim() || null;

  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<Trigger>("call_outcome:lead_captured");
  const [steps, setSteps] = useState<Step[]>([{ ...DEFAULT_STEP }]);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Auto-set name based on trigger selection for faster setup
  useEffect(() => {
    if (!name || name === "" || name === "Lead Captured Follow-Up" || name === "Voicemail Follow-Up" || name === "Missed Call Recovery" || name === "Booking Confirmed" || name === "No-Show Recovery" || name === "Post-Appointment" || name === "Manual Sequence") {
      const triggerNames: Record<Trigger, string> = {
        "call_outcome:lead_captured": "Lead Captured Follow-Up",
        "call_outcome:voicemail_left": "Voicemail Follow-Up",
        "call_outcome:no_answer": "Missed Call Recovery",
        "call_outcome:booked": "Booking Confirmed",
        "booking_status:confirmed": "Booking Confirmed",
        "booking_status:no_show": "No-Show Recovery",
        "booking_status:completed": "Post-Appointment",
        "manual": "Manual Sequence",
      };
      setName(triggerNames[trigger] || "");
    }
  }, [trigger]);

  useEffect(() => {
    if (!effectiveWorkspaceId) return;
  }, [effectiveWorkspaceId]);

  const canSave = useMemo(() => {
    if (!effectiveWorkspaceId) return false;
    if (!name.trim()) return false;
    if (!steps.length) return false;
    return steps.every((s) => s.template.trim().length > 0);
  }, [effectiveWorkspaceId, name, steps]);

  const addStep = () => setSteps((prev) => [...prev, { ...DEFAULT_STEP, delayAmount: 24, delayUnit: "hours" }]);

  const removeStep = (idx: number) =>
    setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      // 1) Create sequence
      const res = await fetch("/api/sequences", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), trigger_type: trigger, is_active: active }),
      });
      const created = (await res.json().catch(() => null)) as { sequence?: { id?: string } ; error?: string } | null;
      const sequenceId = created?.sequence?.id;
      if (!res.ok || !sequenceId) {
        toast.error(t("errors.createFailed"));
        return;
      }

      track("sequence_created", { trigger });

      // 2) Add steps
      for (let i = 0; i < steps.length; i += 1) {
        const s = steps[i]!;
        const stepRes = await fetch(`/api/sequences/${encodeURIComponent(sequenceId)}/steps`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: s.channel,
            delay_minutes: toMinutes(s),
            template_content: s.template,
            conditions: {
              stop_if_reply: s.stopIfReply,
              stop_if_booked: s.stopIfBooked,
            },
          }),
        });
        if (!stepRes.ok) {
          toast.error(t("errors.stepFailed"));
          router.push("/app/follow-ups");
          return;
        }
      }

      toast.success(t("toast.saved"));
      router.push("/app/follow-ups");
    } catch {
      toast.error(tToast("error.generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <Link
        href="/app/follow-ups"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">{t("title")}</h1>
          <p className="mt-1.5 text-[13px] text-[var(--text-secondary)] leading-relaxed">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canSave || saving}
          className={cn(
            "px-5 py-2 rounded-xl text-sm font-semibold",
            canSave ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90" : "bg-[var(--bg-input)] text-[var(--text-tertiary)]",
            saving ? "opacity-60 cursor-not-allowed" : "",
          )}
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t("basics.heading")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">{t("basics.name")}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("basics.namePlaceholder")}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-2">{t("basics.trigger")}</label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value as Trigger)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
              >
                <option value="call_outcome:lead_captured">{t("triggers.leadCaptured")}</option>
                <option value="call_outcome:voicemail_left">{t("triggers.voicemailLeft")}</option>
                <option value="call_outcome:no_answer">{t("triggers.noAnswer")}</option>
                <option value="call_outcome:booked">{t("triggers.booked")}</option>
                <option value="booking_status:confirmed">{t("triggers.bookingConfirmed")}</option>
                <option value="booking_status:no_show">{t("triggers.bookingNoShow")}</option>
                <option value="booking_status:completed">{t("triggers.bookingCompleted")}</option>
                <option value="manual">{t("triggers.manual")}</option>
              </select>
            </div>
          </div>
          <label className="mt-4 inline-flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
            {t("basics.active")}
          </label>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("steps.heading")}</h2>
            <button
              type="button"
              onClick={addStep}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              <Plus className="h-4 w-4" />
              {t("steps.add")}
            </button>
          </div>

          <div className="space-y-3">
            {steps.map((s, idx) => (
              <div key={idx} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-input)] p-4">
                <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4">
                  <div>
                    <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">{t("steps.channel")}</label>
                    <select
                      value={s.channel}
                      onChange={(e) =>
                        setSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, channel: e.target.value as StepChannel } : x)))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
                    >
                      <option value="sms">{t("steps.sms")}</option>
                      <option value="call">{t("steps.call")}</option>
                      <option value="email">{t("steps.email")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">{t("steps.delay")}</label>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <input
                        type="number"
                        min={0}
                        value={s.delayAmount}
                        onChange={(e) =>
                          setSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, delayAmount: Number(e.target.value) } : x)))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
                      />
                      <select
                        value={s.delayUnit}
                        onChange={(e) =>
                          setSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, delayUnit: e.target.value as Step["delayUnit"] } : x)))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
                      >
                        <option value="minutes">{t("steps.minutes")}</option>
                        <option value="hours">{t("steps.hours")}</option>
                        <option value="days">{t("steps.days")}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">{t("steps.template")}</label>
                  <textarea
                    rows={3}
                    value={s.template}
                    onChange={(e) =>
                      setSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, template: e.target.value } : x)))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] resize-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["{firstName}", "{businessName}", "{appointmentDate}", "{serviceName}"].map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() =>
                          setSteps((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, template: `${x.template}${x.template.endsWith(" ") || !x.template ? "" : " "}${token}` } : x,
                            ),
                          )
                        }
                        className="text-[11px] rounded-full border border-[var(--border-default)] px-2 py-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={s.stopIfReply}
                        onChange={(e) =>
                          setSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, stopIfReply: e.target.checked } : x)))
                        }
                        className="h-4 w-4"
                      />
                      {t("steps.stopIfReply")}
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={s.stopIfBooked}
                        onChange={(e) =>
                          setSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, stopIfBooked: e.target.checked } : x)))
                        }
                        className="h-4 w-4"
                      />
                      {t("steps.stopIfBooked")}
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className={cn(
                      "inline-flex items-center gap-2 text-sm",
                      steps.length <= 1 ? "text-[var(--text-tertiary)] cursor-not-allowed" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    )}
                    disabled={steps.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("steps.remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

