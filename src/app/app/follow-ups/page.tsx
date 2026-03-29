"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecoveryProfileSelector } from "@/components/settings/RecoveryProfileSelector";
import { Plus, Pause, Play, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type Sequence = { id: string; name: string; trigger_type?: string; is_active?: boolean };

type TemplateStep = {
  channel: "sms" | "call" | "email";
  delayAmount: number;
  delayUnit: "minutes" | "hours" | "days";
  template: string;
  stopIfReply: boolean;
  stopIfBooked: boolean;
};

type BuiltInTemplate = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: TemplateStep[];
};

const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: "missed-call-recovery",
    name: "Missed Call Recovery",
    description: "SMS immediately after missed call, then call back in 2 hours, then email next day",
    trigger: "call_outcome:no_answer",
    steps: [
      {
        channel: "sms",
        delayAmount: 0,
        delayUnit: "minutes",
        template: "Hi {firstName} — we just tried to reach you about {serviceName}. Can you call us back when available?",
        stopIfReply: true,
        stopIfBooked: true,
      },
      {
        channel: "call",
        delayAmount: 2,
        delayUnit: "hours",
        template: "Following up on our earlier call about {serviceName}.",
        stopIfReply: true,
        stopIfBooked: true,
      },
      {
        channel: "email",
        delayAmount: 1,
        delayUnit: "days",
        template: "Hi {firstName},\n\nWe wanted to follow up about {serviceName}. Please let us know if you'd like to discuss further.\n\nBest regards,\n{businessName}",
        stopIfReply: false,
        stopIfBooked: true,
      },
    ],
  },
  {
    id: "lead-nurture",
    name: "Lead Nurture",
    description: "SMS thank you after call, then follow-up call in 1 day, then email in 3 days",
    trigger: "call_outcome:lead_captured",
    steps: [
      {
        channel: "sms",
        delayAmount: 0,
        delayUnit: "minutes",
        template: "Thanks {firstName}! We appreciate you taking the time to chat with us about {serviceName}.",
        stopIfReply: false,
        stopIfBooked: true,
      },
      {
        channel: "call",
        delayAmount: 1,
        delayUnit: "days",
        template: "Hi {firstName}, just checking in to see if you have any questions about {serviceName}.",
        stopIfReply: true,
        stopIfBooked: true,
      },
      {
        channel: "email",
        delayAmount: 3,
        delayUnit: "days",
        template: "Hi {firstName},\n\nFollowing up on our conversation about {serviceName}. We'd love to help you move forward.\n\nBest regards,\n{businessName}",
        stopIfReply: false,
        stopIfBooked: true,
      },
    ],
  },
  {
    id: "appointment-reminder",
    name: "Appointment Reminder",
    description: "SMS 24 hours before, then SMS 1 hour before",
    trigger: "booking_status:confirmed",
    steps: [
      {
        channel: "sms",
        delayAmount: 24,
        delayUnit: "hours",
        template: "Reminder: You have an appointment scheduled for {appointmentDate}. Reply CONFIRM to confirm or call us if you need to reschedule.",
        stopIfReply: false,
        stopIfBooked: false,
      },
      {
        channel: "sms",
        delayAmount: 1,
        delayUnit: "hours",
        template: "Your appointment is in 1 hour! We're looking forward to seeing you.",
        stopIfReply: false,
        stopIfBooked: false,
      },
    ],
  },
  {
    id: "re-engagement",
    name: "Re-engagement",
    description: "Call after 7 days of no contact, then SMS in 1 day, then email in 3 days",
    trigger: "manual",
    steps: [
      {
        channel: "call",
        delayAmount: 7,
        delayUnit: "days",
        template: "Hi {firstName}, it's been a while since we last connected. We wanted to check in and see how things are going with {serviceName}.",
        stopIfReply: true,
        stopIfBooked: true,
      },
      {
        channel: "sms",
        delayAmount: 1,
        delayUnit: "days",
        template: "We're here if you'd like to continue our conversation about {serviceName}. Let us know how we can help!",
        stopIfReply: true,
        stopIfBooked: true,
      },
      {
        channel: "email",
        delayAmount: 3,
        delayUnit: "days",
        template: "Hi {firstName},\n\nWe'd love to reconnect and discuss how we can support you with {serviceName}.\n\nBest regards,\n{businessName}",
        stopIfReply: false,
        stopIfBooked: true,
      },
    ],
  },
];

export default function AppFollowUpsPage() {
  const { workspaceId } = useWorkspace();
  const t = useTranslations("followUps");
  const tToast = useTranslations("toast");
  const [tab, setTab] = useState<"templates" | "active">("templates");
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [templateInProgress, setTemplateInProgress] = useState<string | null>(null);

  const refetchSequences = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    setFetchError(null);
    fetch(`/api/sequences?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(t("loadError"));
        return r.json();
      })
      .then((d: { sequences?: Sequence[] }) => {
        setSequences(d.sequences ?? []);
      })
      .catch((err) => {
        setSequences([]);
        setFetchError(err instanceof Error ? err.message : t("loadError"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [workspaceId, t]);

  useEffect(() => {
    if (!workspaceId) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    refetchSequences();
  }, [workspaceId, refetchSequences]);

  const useTemplate = async (template: BuiltInTemplate) => {
    setTemplateInProgress(template.id);
    try {
      const res = await fetch("/api/sequences", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          trigger_type: template.trigger,
          is_active: true,
        }),
      });
      const created = (await res.json().catch(() => null)) as { sequence?: { id?: string }; error?: string } | null;
      const sequenceId = created?.sequence?.id;
      if (!res.ok || !sequenceId) {
        if (created?.error) console.error("[follow-ups] create error:", created.error);
        toast.error(t("createPage.errors.createFailed"));
        return;
      }

      for (let i = 0; i < template.steps.length; i += 1) {
        const s = template.steps[i]!;
        const delayMinutes =
          s.delayUnit === "minutes" ? s.delayAmount : s.delayUnit === "hours" ? s.delayAmount * 60 : s.delayAmount * 60 * 24;

        const stepRes = await fetch(`/api/sequences/${encodeURIComponent(sequenceId)}/steps`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: s.channel,
            delay_minutes: delayMinutes,
            template_content: s.template,
            conditions: {
              stop_if_reply: s.stopIfReply,
              stop_if_booked: s.stopIfBooked,
            },
          }),
        });
        if (!stepRes.ok) {
          toast.error(t("createPage.errors.stepFailed"));
          return;
        }
      }

      toast.success(t("createPage.toast.saved"));
      refetchSequences();
    } catch {
      toast.error(tToast("error.generic"));
    } finally {
      setTemplateInProgress(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">{t("title")}</h1>
        <Link href="/app/follow-ups/create">
          <Button variant="primary" size="sm" className="gap-1">
            <Plus className="w-4 h-4" />
            {t("create")}
          </Button>
        </Link>
      </div>
      <div className="mb-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        <RecoveryProfileSelector />
      </div>
      {/* Intelligence callout for follow-ups queue */}
      {sequences.length > 0 && (
        <div className="mb-6 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/[0.04] p-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--accent-primary)] font-medium">
              Your follow-up queue represents ~${(sequences.reduce((sum, s) => sum + (s.is_active ? 37.5 : 0), 0)).toLocaleString("en-US", { maximumFractionDigits: 0 })} in recoverable revenue. Recovery mode is active.
            </p>
          </div>
        </div>
      )}
      <div className="flex gap-2 mb-6 border-b border-[var(--border-default)] pb-2">
        <button
          type="button"
          onClick={() => setTab("templates")}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] ${tab === "templates" ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}
        >
          {t("tabs.templates")}
        </button>
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] ${tab === "active" ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}
        >
          {t("tabs.active")}
        </button>
      </div>
      {loading ? (
        <div className="skeleton-shimmer h-40 rounded-2xl border border-[var(--border-default)]" />
      ) : fetchError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{fetchError}</p>
          <button
            type="button"
            onClick={() => { setLoading(true); setFetchError(null); refetchSequences(); }}
            className="mt-3 px-4 py-2 rounded-xl border border-[var(--border-medium)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
          >
            {t("retry")}
          </button>
        </div>
      ) : tab === "active" && sequences.length > 1 ? (
        <>
          <div className="flex gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={async () => {
                try {
                  await Promise.all(
                    sequences.map((s) =>
                      fetch(`/api/sequences/${s.id}`, {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "paused" }),
                      })
                    )
                  );
                  toast.success(t("allPaused", { defaultValue: "All sequences paused" }));
                  refetchSequences();
                } catch {
                  toast.error(t("pauseFailed", { defaultValue: "Failed to pause sequences" }));
                }
              }}
            >
              <Pause className="w-3.5 h-3.5" />
              {t("pauseAll", { defaultValue: "Pause all" })}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={async () => {
                try {
                  await Promise.all(
                    sequences.map((s) =>
                      fetch(`/api/sequences/${s.id}`, {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "active" }),
                      })
                    )
                  );
                  toast.success(t("allResumed", { defaultValue: "All sequences resumed" }));
                  refetchSequences();
                } catch {
                  toast.error(t("resumeFailed", { defaultValue: "Failed to resume sequences" }));
                }
              }}
            >
              <Play className="w-3.5 h-3.5" />
              {t("resumeAll", { defaultValue: "Resume all" })}
            </Button>
          </div>
          <ul className="space-y-3">
            {sequences.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{s.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{s.trigger_type ?? "manual"}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("pauseSequence")}
                    onClick={() => {
                      fetch(`/api/sequences/${s.id}`, {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "paused" }),
                      }).then((res) => {
                        if (res.ok) { toast.success(t("sequencePaused", { defaultValue: "Sequence paused" })); refetchSequences(); }
                        else toast.error(t("pauseFailed", { defaultValue: "Failed to pause sequence" }));
                      }).catch(() => toast.error(t("pauseFailed", { defaultValue: "Failed to pause sequence" })));
                    }}
                  >
                    <Pause className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("resumeSequence")}
                    onClick={() => {
                      fetch(`/api/sequences/${s.id}`, {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "active" }),
                      }).then((res) => {
                        if (res.ok) { toast.success(t("sequenceResumed", { defaultValue: "Sequence resumed" })); refetchSequences(); }
                        else toast.error(t("resumeFailed", { defaultValue: "Failed to resume sequence" }));
                      }).catch(() => toast.error(t("resumeFailed", { defaultValue: "Failed to resume sequence" })));
                    }}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : tab === "templates" ? (
        <div>
          {sequences.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <p className="text-sm text-[var(--text-secondary)] mb-6">{t("empty.templatesBody") || "Get started with a pre-built template or create your own."}</p>
              </div>
              <div className="grid gap-3">
                {BUILT_IN_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-[var(--text-primary)]">{template.name}</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">{template.description}</p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-2">{template.steps.length} steps</p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => void useTemplate(template)}
                        disabled={templateInProgress !== null}
                        className="gap-1 whitespace-nowrap"
                      >
                        <Copy className="w-4 h-4" />
                        {templateInProgress === template.id ? "Using..." : "Use"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center pt-4 border-t border-[var(--border-default)]">
                <Link href="/app/follow-ups/create">
                  <Button variant="ghost" size="sm">
                    {t("create")}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {sequences.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{s.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{s.trigger_type ?? "manual"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t("pauseSequence")}
                      onClick={() => {
                        fetch(`/api/sequences/${s.id}`, {
                          method: "PATCH",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "paused" }),
                        }).then((res) => {
                          if (res.ok) { toast.success(t("sequencePaused", { defaultValue: "Sequence paused" })); refetchSequences(); }
                          else toast.error(t("pauseFailed", { defaultValue: "Failed to pause sequence" }));
                        }).catch(() => toast.error(t("pauseFailed", { defaultValue: "Failed to pause sequence" })));
                      }}
                    >
                      <Pause className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t("resumeSequence")}
                      onClick={() => {
                        fetch(`/api/sequences/${s.id}`, {
                          method: "PATCH",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "active" }),
                        }).then((res) => {
                          if (res.ok) { toast.success(t("sequenceResumed", { defaultValue: "Sequence resumed" })); refetchSequences(); }
                          else toast.error(t("resumeFailed", { defaultValue: "Failed to resume sequence" }));
                        }).catch(() => toast.error(t("resumeFailed", { defaultValue: "Failed to resume sequence" })));
                      }}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <EmptyState
          title={t("empty.activeTitle")}
          description={t("empty.activeBody")}
          primaryAction={{ label: t("create"), href: "/app/follow-ups/create" }}
        />
      )}
    </div>
  );
}
