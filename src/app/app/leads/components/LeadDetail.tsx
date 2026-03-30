"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Phone, MessageSquare, Calendar, StickyNote, Archive, Brain } from "lucide-react";
import type { LeadView } from "../page";
import { getSourceDisplay, getStatusDisplay } from "../helpers";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LeadBrainPanel } from "@/components/intelligence/LeadBrainPanel";

export type LeadStatus = "New" | "Contacted" | "Qualified" | "Appointment Set" | "Won" | "Lost";

const STATUS_ORDER: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Appointment Set",
  "Won",
  "Lost",
];

const STATUS_HINTS: Record<LeadStatus, string> = {
  New: "Lead just arrived — brain is evaluating",
  Contacted: "First outreach sent — awaiting response",
  Qualified: "Interest confirmed — brain is nurturing",
  "Appointment Set": "Meeting booked — brain will send reminders",
  Won: "Deal closed — brain may offer retention outreach",
  Lost: "Did not convert — brain may attempt reactivation",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

export type LeadDetailProps = {
  lead: LeadView;
  calls: Array<{ id: string; call_started_at?: string; outcome?: string }>;
  callsLoading: boolean;
  scoreBadgeClass: (score: number | null) => string;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onNotesBlur: (leadId: string, notes: string) => void;
  onArchive: (leadId: string) => void;
  outboundCallType: string;
  setOutboundCallType: (value: string) => void;
  onHaveAICall: () => void;
  outboundCalling: boolean;
};

interface BrainHint {
  next_best_action: string;
  action_timing: string;
  lifecycle_phase: string;
}

export function LeadDetail({
  lead,
  calls,
  callsLoading,
  scoreBadgeClass,
  onStatusChange,
  onNotesBlur,
  onArchive,
  outboundCallType,
  setOutboundCallType,
  onHaveAICall,
  outboundCalling,
}: LeadDetailProps) {
  const tRoot = useTranslations();
  const t = useTranslations("leads");
  const [brainHint, setBrainHint] = useState<BrainHint | null>(null);

  useEffect(() => {
    fetch(`/api/leads/${lead.id}/intelligence`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.intelligence) {
          setBrainHint({
            next_best_action: data.intelligence.next_best_action,
            action_timing: data.intelligence.action_timing,
            lifecycle_phase: data.intelligence.lifecycle_phase,
          });
        }
      })
      .catch(() => {});
  }, [lead.id]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${scoreBadgeClass(lead.score)}`}
          title={t("scoreLabel")}
        >
          {lead.score ?? "—"}
        </span>
        <div>
          <p className="text-xs text-[var(--text-secondary)]">{lead.service} · {getSourceDisplay(lead.source, tRoot)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={lead.status === "Won" ? "success" : lead.status === "Lost" ? "error" : "neutral"}>{getStatusDisplay(lead.status, tRoot)}</Badge>
            <span className="text-[11px] text-[var(--text-secondary)]">{t("detail.agent")}: {lead.assignedAgent}</span>
            <span className="text-[11px] text-[var(--text-secondary)]">{t("detail.created")} {formatDate(lead.createdAt)}</span>
          </div>
        </div>
      </div>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">{t("detail.contact")}</h3>
        <div className="grid gap-2">
          <Input label={t("detail.name")} value={lead.name} readOnly className="bg-[var(--bg-card)]" />
          <Input label={t("detail.phone")} value={lead.phone} readOnly className="bg-[var(--bg-card)]" />
          <Input label={t("detail.email")} value={lead.email} readOnly className="bg-[var(--bg-card)]" />
        </div>
      </section>

      {lead.service && lead.service !== t("defaultService") && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">{t("detail.whatTheyNeed")}</h3>
          <p className="text-sm text-[var(--text-primary)]">{lead.service}</p>
        </section>
      )}

      {/* Brain active management — replaces manual stage control */}
      {brainHint ? (
        <section className="rounded-xl bg-violet-500/[0.06] border border-violet-500/10 px-3.5 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-violet-500/15 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              </div>
              <span className="text-xs font-semibold text-violet-400">
                {brainHint.next_best_action.replace(/_/g, " ")}
              </span>
            </div>
            {brainHint.action_timing === "immediate" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                executing
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-tertiary)] text-[10px] font-medium border border-[var(--border-default)]">
                {brainHint.action_timing}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] ml-8">
            Phase: <span className="font-medium text-[var(--text-primary)]">{brainHint.lifecycle_phase}</span>
            {brainHint.action_timing === "immediate" ? " · Brain is handling this autonomously" : " · Queued for optimal timing"}
          </p>

          {/* Stage — brain-managed with manual override */}
          <div className="pt-2 border-t border-violet-500/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">{t("detail.stage")} · brain-managed</span>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById(`stage-override-${lead.id}`);
                  if (el) el.classList.toggle("hidden");
                }}
                className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] underline decoration-dotted underline-offset-2"
              >
                override
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              {STATUS_ORDER.map((s) => {
                const isCurrent = lead.status === s;
                const isPast = STATUS_ORDER.indexOf(s) < STATUS_ORDER.indexOf(lead.status);
                return (
                  <div key={s} className="flex items-center gap-1" title={`${getStatusDisplay(s, tRoot)}: ${STATUS_HINTS[s]}`}>
                    <div className={`h-1.5 rounded-full transition-all cursor-help ${
                      isCurrent
                        ? "w-6 bg-violet-400"
                        : isPast
                          ? "w-3 bg-violet-400/40"
                          : "w-3 bg-[var(--border-default)]"
                    }`} />
                  </div>
                );
              })}
              <span className="text-[11px] font-medium text-[var(--text-primary)] ml-1">{getStatusDisplay(lead.status, tRoot)}</span>
            </div>
            <select
              id={`stage-override-${lead.id}`}
              value={lead.status}
              onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
              className="hidden w-full mt-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{getStatusDisplay(s, tRoot)}</option>
              ))}
            </select>
          </div>
        </section>
      ) : (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">{t("detail.stage")}</h3>
          <select
            value={lead.status}
            onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
            className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{getStatusDisplay(s, tRoot)}</option>
            ))}
          </select>
        </section>
      )}

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">{t("detail.timeline")}</h3>
        <ol className="space-y-2 text-xs">
          {lead.timeline.map((item) => (
            <li key={`${item.at}-${item.label}`} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-tertiary)]" />
              <div>
                <p className="text-[var(--text-primary)]">{item.label}</p>
                <p className="text-[11px] text-[var(--text-secondary)]">{formatDate(item.at)}</p>
              </div>
            </li>
          ))}
          {calls.length > 0 && calls.map((call) => (
            <li key={call.id} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
              <div>
                <Link href={`/app/calls/${call.id}`} className="text-[var(--text-primary)] hover:underline">
                  {t("detail.callPrefix")} {call.call_started_at ? formatDate(call.call_started_at) : ""} {call.outcome ? ` · ${call.outcome}` : ""}
                </Link>
              </div>
            </li>
          ))}
        </ol>
        {callsLoading && <p className="text-xs text-[var(--text-secondary)]">{t("loadingCalls")}</p>}
      </section>

      {/* Autonomous Revenue Brain — Intelligence Panel */}
      <LeadBrainPanel leadId={lead.id} />

      <section className="pt-2 border-t border-[var(--border-default)]">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">{t("detail.notes")}</h3>
        <textarea
          defaultValue={lead.notes}
          onBlur={(e) => onNotesBlur(lead.id, e.target.value.trim())}
          placeholder={t("detail.notesPlaceholder")}
          rows={3}
          className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-medium)] resize-none"
        />
      </section>

      <div className="flex flex-wrap gap-2 pt-2">
        {lead.phone ? (
          <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-medium px-3 py-2 hover:bg-[var(--bg-hover)]">
            <Phone className="w-3.5 h-3.5" /> {t("actionCall")}
          </a>
        ) : null}
        <Link href={lead.id ? `/app/messages?lead_id=${lead.id}` : "/app/messages"} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-medium px-3 py-2 hover:bg-[var(--bg-hover)]">
          <MessageSquare className="w-3.5 h-3.5" /> {t("detail.textButton")}
        </Link>
        <Link href="/app/calendar" className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-medium px-3 py-2 hover:bg-[var(--bg-hover)]">
          <Calendar className="w-3.5 h-3.5" /> {t("actionSchedule")}
        </Link>
        <Button variant="ghost" size="sm" className="text-xs">
          <StickyNote className="w-3.5 h-3.5 mr-1.5" /> {t("detail.addNote")}
        </Button>
        {lead.phone ? (
          <>
            {/* Brain auto-selects call type based on lifecycle phase */}
            {brainHint && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/[0.06] border border-violet-500/10 text-[10px] text-violet-400 font-medium">
                <Brain className="w-3 h-3" />
                {brainHint.lifecycle_phase === "appointment" ? "reminder" : brainHint.next_best_action === "schedule_followup" ? "follow-up" : "outreach"}
              </span>
            )}
            {/* Hidden override — only for edge cases */}
            <select
              value={outboundCallType || "default"}
              onChange={(e) => setOutboundCallType(e.target.value === "default" ? "" : e.target.value)}
              className="hidden rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-2 py-1.5 text-xs text-[var(--text-primary)]"
              aria-label={t("detail.callTypeLabel")}
            >
              <option value="default">{t("detail.callTypes.default")}</option>
              <option value="lead_followup">{t("detail.callTypes.followUp")}</option>
              <option value="appointment_reminder">{t("detail.callTypes.reminder")}</option>
            </select>
            <Button variant="primary" size="sm" onClick={() => void onHaveAICall()} disabled={outboundCalling} className="text-xs">
              <Phone className="w-3.5 h-3.5 mr-1.5" /> {outboundCalling ? t("detail.startingCall") : t("detail.haveAiCall")}
            </Button>
          </>
        ) : null}
        <Button variant="secondary" size="sm" onClick={() => onArchive(lead.id)}>
          <Archive className="w-3.5 h-3.5 mr-1.5" /> {t("detail.archive")}
        </Button>
      </div>
    </div>
  );
}
