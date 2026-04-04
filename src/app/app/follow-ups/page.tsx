"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecoveryProfileSelector } from "@/components/settings/RecoveryProfileSelector";
import { Plus, Pause, Play, Copy, Phone, MessageSquare, Mail, ArrowRight, Zap, Activity } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
  {
    id: "no-show-recovery",
    name: "No-Show Recovery",
    description: "SMS immediately after no-show, call after 4 hours, email next day",
    trigger: "booking_status:no_show",
    steps: [
      {
        channel: "sms",
        delayAmount: 0,
        delayUnit: "minutes",
        template: "We missed you today at your scheduled appointment. Let us know if you'd like to reschedule.",
        stopIfReply: true,
        stopIfBooked: true,
      },
      {
        channel: "call",
        delayAmount: 4,
        delayUnit: "hours",
        template: "Hi {firstName}, we noticed you missed your appointment today. We'd love to help reschedule when it works better for you.",
        stopIfReply: true,
        stopIfBooked: true,
      },
      {
        channel: "email",
        delayAmount: 1,
        delayUnit: "days",
        template: "Hi {firstName},\n\nWe'd like to help you get back on track. Please let us know your availability to reschedule.\n\nBest regards,\n{businessName}",
        stopIfReply: false,
        stopIfBooked: true,
      },
    ],
  },
  {
    id: "stale-pipeline-recovery",
    name: "Stale Pipeline Recovery",
    description: "Call immediately, SMS after 1 day, email after 3 days",
    trigger: "manual",
    steps: [
      {
        channel: "call",
        delayAmount: 0,
        delayUnit: "minutes",
        template: "Hi {firstName}, it's been a while since we connected. I wanted to personally reach out and see if there's still interest in {serviceName}.",
        stopIfReply: true,
        stopIfBooked: true,
      },
      {
        channel: "sms",
        delayAmount: 1,
        delayUnit: "days",
        template: "Hi {firstName}, following up on our call. Ready to move forward when you are.",
        stopIfReply: true,
        stopIfBooked: true,
      },
      {
        channel: "email",
        delayAmount: 3,
        delayUnit: "days",
        template: "Hi {firstName},\n\nIt's been a while since we connected about {serviceName}. We're still here to help whenever you're ready.\n\nBest regards,\n{businessName}",
        stopIfReply: false,
        stopIfBooked: true,
      },
    ],
  },
];

type BrainActivity = {
  follow_ups_sent: number;
};

type AutonomousAction = {
  id: string;
  action_type: string;
  timestamp: string;
  status: string;
};

export default function AppFollowUpsPage() {
  const { workspaceId } = useWorkspace();
  const t = useTranslations("followUps");
  const tToast = useTranslations("toast");
  const [tab, setTab] = useState<"templates" | "active" | "brain">("templates");
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [templateInProgress, setTemplateInProgress] = useState<string | null>(null);
  const [confirmPauseAll, setConfirmPauseAll] = useState(false);
  const [confirmResumeAll, setConfirmResumeAll] = useState(false);
  const [brainActivity, setBrainActivity] = useState<BrainActivity | null>(null);
  const [autonomousActions, setAutonomousActions] = useState<AutonomousAction[]>([]);
  const [brainLoading, setBrainLoading] = useState(false);

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

  const refetchBrainActivity = useCallback(() => {
    if (!workspaceId) return;
    setBrainLoading(true);

    // Fetch summary data for follow-ups count
    fetch(`/api/dashboard/summary?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => {
        if (d && typeof d.follow_ups_sent === "number") {
          setBrainActivity({ follow_ups_sent: d.follow_ups_sent });
        }
      })
      .catch(() => {
        // Graceful failure
      });

    // Fetch autonomous actions
    fetch(`/api/autonomous-actions?workspace_id=${encodeURIComponent(workspaceId)}&action_type=schedule_followup`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => {
        if (d && Array.isArray(d.actions)) {
          setAutonomousActions(d.actions);
        }
      })
      .catch(() => {
        // Graceful failure - API may not exist
      })
      .finally(() => {
        setBrainLoading(false);
      });
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    refetchSequences();
  }, [workspaceId, refetchSequences]);

  useEffect(() => {
    if (tab === "brain" && workspaceId) {
      refetchBrainActivity();
    }
  }, [tab, workspaceId, refetchBrainActivity]);

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
      <Breadcrumbs items={[{ label: "Home", href: "/app" }, { label: "Follow-ups" }]} />
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
      {/* AI-managed follow-ups status */}
      <div className="mb-6 rounded-xl border border-violet-500/15 bg-violet-500/[0.04] p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <Zap className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          {sequences.length > 0 || brainActivity?.follow_ups_sent ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-violet-400 font-semibold">Automated follow-ups active</p>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {sequences.filter(s => s.is_active).length} automated follow-ups running. Your AI operator is handling follow-ups automatically via call, SMS, and email based on your configured rules.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-violet-400 font-semibold mb-1">Follow-ups will start automatically when leads arrive</p>
              <p className="text-xs text-[var(--text-secondary)]">
                When new leads arrive, your AI operator will automatically follow up based on your configured templates and rules. Choose a template below to get started.
              </p>
            </>
          )}
        </div>
      </div>
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
        <button
          type="button"
          onClick={() => setTab("brain")}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] ${tab === "brain" ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}
        >
          Activity
        </button>
      </div>
      {tab === "brain" ? (
        brainLoading ? (
          <div className="skeleton-shimmer h-40 rounded-2xl border border-[var(--border-default)]" />
        ) : (
          <div className="space-y-4">
            {/* Activity Dashboard */}
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-[var(--accent-primary)]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Follow-up Activity</h2>
              </div>

              {/* Follow-ups Executed */}
              <div className="mb-6 p-4 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-default)]">
                <p className="text-xs uppercase font-medium text-[var(--text-tertiary)] mb-2">Follow-ups Executed</p>
                <p className="text-3xl font-bold text-[var(--accent-primary)]">
                  {brainActivity?.follow_ups_sent ?? 0}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  Total automated follow-up actions executed
                </p>
              </div>

              {/* Active Follow-ups — show only real follow-ups that exist */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Your Follow-ups</h3>
                {sequences.length > 0 ? (
                  <div className="space-y-2">
                    {sequences.map((seq) => (
                      <div key={seq.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-default)]">
                        <div>
                          <span className="text-sm text-[var(--text-primary)]">{seq.name}</span>
                          {seq.trigger_type && (
                            <span className="ml-2 text-xs text-[var(--text-tertiary)]">
                              {seq.trigger_type.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        {seq.is_active ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-500" />
                            <span className="text-xs font-medium text-green-600 dark:text-green-500">Active</span>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-[var(--text-tertiary)]">Paused</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-tertiary)] p-3 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-default)]">
                    No follow-ups created yet. Choose a template above to start automatically following up with leads.
                  </p>
                )}
              </div>

              {/* Recent Autonomous Actions */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recent Autonomous Actions</h3>
                {autonomousActions.length > 0 ? (
                  <div className="space-y-2">
                    {autonomousActions.slice(0, 5).map((action) => (
                      <div key={action.id} className="p-3 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-default)]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-[var(--text-primary)]">
                            {action.action_type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
                          </span>
                          {action.status === "completed" && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 font-medium">
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {new Date(action.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-default)] text-center">
                    <p className="text-sm text-[var(--text-secondary)]">
                      Activity will appear here as leads are processed
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      ) : loading ? (
        <div className="skeleton-shimmer h-40 rounded-2xl border border-[var(--border-default)]" />
      ) : fetchError ? (
        <div className="rounded-2xl border border-[var(--accent-danger,#ef4444)]/30 bg-[var(--accent-danger,#ef4444)]/5 p-8 text-center">
          <p className="text-sm text-[var(--accent-danger,#ef4444)]">{fetchError}</p>
          <button
            type="button"
            onClick={() => { setLoading(true); setFetchError(null); refetchSequences(); }}
            className="mt-3 px-4 py-2 rounded-xl border border-[var(--border-medium)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
          >
            {t("retry")}
          </button>
        </div>
      ) : tab === "templates" ? (
        <div>
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
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-[var(--text-primary)]">{template.name}</h3>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">{template.description}</p>
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
                  {/* Step visualization */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {template.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-hover)] border border-[var(--border-default)]">
                          {step.channel === "call" && <Phone className="w-4 h-4 text-[var(--accent-primary)]" />}
                          {step.channel === "sms" && <MessageSquare className="w-4 h-4 text-[var(--accent-primary)]" />}
                          {step.channel === "email" && <Mail className="w-4 h-4 text-[var(--accent-primary)]" />}
                        </div>
                        {idx < template.steps.length - 1 && (
                          <>
                            <ArrowRight className="w-3 h-3 text-[var(--text-tertiary)] flex-shrink-0" />
                            <div className="text-xs text-[var(--text-tertiary)] font-medium whitespace-nowrap flex-shrink-0">
                              {step.delayAmount}{step.delayUnit === "minutes" ? "m" : step.delayUnit === "hours" ? "h" : "d"}
                            </div>
                            <ArrowRight className="w-3 h-3 text-[var(--text-tertiary)] flex-shrink-0" />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Quick action buttons */}
            {sequences.length === 0 && (
              <div className="pt-4 border-t border-[var(--border-default)] space-y-3">
                <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase">Or activate quick recovery:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 justify-start text-sm"
                    onClick={() => {
                      const noShowTemplate = BUILT_IN_TEMPLATES.find(t => t.id === "no-show-recovery");
                      if (noShowTemplate) useTemplate(noShowTemplate);
                    }}
                    disabled={templateInProgress !== null}
                  >
                    <Zap className="w-4 h-4" />
                    Activate No-Show Recovery
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 justify-start text-sm"
                    onClick={() => {
                      const stalePipelineTemplate = BUILT_IN_TEMPLATES.find(t => t.id === "stale-pipeline-recovery");
                      if (stalePipelineTemplate) useTemplate(stalePipelineTemplate);
                    }}
                    disabled={templateInProgress !== null}
                  >
                    <Zap className="w-4 h-4" />
                    Activate Stale Pipeline Recovery
                  </Button>
                </div>
              </div>
            )}
            <div className="text-center pt-4 border-t border-[var(--border-default)]">
              <Link href="/app/follow-ups/create">
                <Button variant="ghost" size="sm">
                  {t("create")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : tab === "active" && sequences.length > 1 ? (
        <>
          <div className="flex gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setConfirmPauseAll(true)}
            >
              <Pause className="w-3.5 h-3.5" />
              {t("pauseAll", { defaultValue: "Pause all" })}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setConfirmResumeAll(true)}
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
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium text-[var(--text-primary)]">{s.name}</p>
                    {s.is_active ? (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-500 animate-pulse" />
                        <span className="text-xs font-medium text-green-600 dark:text-green-500">{t("statusActive", { defaultValue: "Active" })}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--bg-hover)]">
                        <span className="text-xs font-medium text-[var(--text-tertiary)]">{t("statusPaused", { defaultValue: "Paused" })}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                      {t("trigger", { defaultValue: "Trigger" })}: {s.trigger_type ? s.trigger_type.split(":").pop()?.replace(/_/g, " ") : t("manual", { defaultValue: "manual" })}
                    </span>
                  </div>
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
                        if (res.ok) { toast.success(t("sequencePaused", { defaultValue: "Follow-up paused" })); refetchSequences(); }
                        else toast.error(t("pauseFailed", { defaultValue: "Failed to pause follow-up" }));
                      }).catch(() => toast.error(t("pauseFailed", { defaultValue: "Failed to pause follow-up" })));
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
                        if (res.ok) { toast.success(t("sequenceResumed", { defaultValue: "Follow-up resumed" })); refetchSequences(); }
                        else toast.error(t("resumeFailed", { defaultValue: "Failed to resume follow-up" }));
                      }).catch(() => toast.error(t("resumeFailed", { defaultValue: "Failed to resume follow-up" })));
                    }}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          title={t("empty.activeTitle")}
          description={t("empty.activeBody")}
          primaryAction={{ label: t("create"), href: "/app/follow-ups/create" }}
        />
      )}

      <ConfirmDialog
        open={confirmPauseAll}
        title={t("pauseAllTitle", { defaultValue: "Pause all follow-ups?" })}
        message={t("pauseAllMessage", { defaultValue: "This will pause all active follow-ups. No automated follow-ups will run until you resume them." })}
        confirmLabel={t("pauseAll", { defaultValue: "Pause all" })}
        onConfirm={async () => {
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
            toast.success(t("allPaused", { defaultValue: "All follow-ups paused" }));
            refetchSequences();
          } catch {
            toast.error(t("pauseFailed", { defaultValue: "Failed to pause follow-ups" }));
          } finally {
            setConfirmPauseAll(false);
          }
        }}
        onClose={() => setConfirmPauseAll(false)}
      />

      <ConfirmDialog
        open={confirmResumeAll}
        title={t("resumeAllTitle", { defaultValue: "Resume all follow-ups?" })}
        message={t("resumeAllMessage", { defaultValue: "This will resume all paused follow-ups. Automated follow-ups will begin running again." })}
        confirmLabel={t("resumeAll", { defaultValue: "Resume all" })}
        onConfirm={async () => {
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
            toast.success(t("allResumed", { defaultValue: "All follow-ups resumed" }));
            refetchSequences();
          } catch {
            toast.error(t("resumeFailed", { defaultValue: "Failed to resume follow-ups" }));
          } finally {
            setConfirmResumeAll(false);
          }
        }}
        onClose={() => setConfirmResumeAll(false)}
      />
    </div>
  );
}
