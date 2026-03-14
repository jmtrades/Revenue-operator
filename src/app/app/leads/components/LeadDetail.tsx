"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Phone, MessageSquare, Calendar, StickyNote, Archive } from "lucide-react";
import type { LeadView } from "../page";
import { getStatusDisplay, getSourceDisplay } from "../page";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export type LeadStatus = "New" | "Contacted" | "Qualified" | "Appointment Set" | "Won" | "Lost";

const STATUS_ORDER: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Appointment Set",
  "Won",
  "Lost",
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

export type LeadDetailProps = {
  lead: LeadView;
  calls: Array<{ id: string; call_started_at?: string; outcome?: string }>;
  callsLoading: boolean;
  scoreBadgeClass: (score: number) => string;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onNotesBlur: (leadId: string, notes: string) => void;
  onArchive: (leadId: string) => void;
  outboundCallType: string;
  setOutboundCallType: (value: string) => void;
  onHaveAICall: () => void;
  outboundCalling: boolean;
};

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
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${scoreBadgeClass(lead.score)}`}
          title={t("scoreLabel")}
        >
          {lead.score}
        </span>
        <div>
          <p className="text-xs text-zinc-500">{lead.service} · {getSourceDisplay(lead.source, tRoot)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={lead.status === "Won" ? "success" : lead.status === "Lost" ? "error" : "neutral"}>{getStatusDisplay(lead.status, tRoot)}</Badge>
            <span className="text-[11px] text-zinc-500">Agent: {lead.assignedAgent}</span>
            <span className="text-[11px] text-zinc-500">Created {formatDate(lead.createdAt)}</span>
          </div>
        </div>
      </div>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Contact</h3>
        <div className="grid gap-2">
          <Input label="Name" value={lead.name} readOnly className="bg-[var(--bg-card)]" />
          <Input label="Phone" value={lead.phone} readOnly className="bg-[var(--bg-card)]" />
          <Input label="Email" value={lead.email} readOnly className="bg-[var(--bg-card)]" />
        </div>
      </section>

      {lead.service && lead.service !== t("defaultService") && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">What they need</h3>
          <p className="text-sm text-zinc-200">{lead.service}</p>
        </section>
      )}

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Stage</h3>
        <select
          value={lead.status}
          onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
          className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-[var(--border-medium)]"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{getStatusDisplay(s, tRoot)}</option>
          ))}
        </select>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Timeline</h3>
        <ol className="space-y-2 text-xs">
          {lead.timeline.map((item) => (
            <li key={`${item.at}-${item.label}`} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
              <div>
                <p className="text-zinc-100">{item.label}</p>
                <p className="text-[11px] text-zinc-500">{formatDate(item.at)}</p>
              </div>
            </li>
          ))}
          {calls.length > 0 && calls.map((call) => (
            <li key={call.id} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
              <div>
                <Link href={`/app/calls/${call.id}`} className="text-zinc-100 hover:underline">
                  Call {call.call_started_at ? formatDate(call.call_started_at) : ""} {call.outcome ? ` · ${call.outcome}` : ""}
                </Link>
              </div>
            </li>
          ))}
        </ol>
        {callsLoading && <p className="text-xs text-zinc-500">Loading calls…</p>}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Notes</h3>
        <textarea
          defaultValue={lead.notes}
          onBlur={(e) => onNotesBlur(lead.id, e.target.value.trim())}
          placeholder="Add notes…"
          rows={3}
          className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[var(--border-medium)] resize-none"
        />
      </section>

      <div className="flex flex-wrap gap-2 pt-2">
        {lead.phone ? (
          <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-medium)] text-zinc-200 text-xs font-medium px-3 py-2 hover:bg-[var(--bg-hover)]">
            <Phone className="w-3.5 h-3.5" /> Call
          </a>
        ) : null}
        <Link href={lead.id ? `/app/messages?lead_id=${lead.id}` : "/app/messages"} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-medium)] text-zinc-200 text-xs font-medium px-3 py-2 hover:bg-[var(--bg-hover)]">
          <MessageSquare className="w-3.5 h-3.5" /> Text
        </Link>
        <Link href="/app/calendar" className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-medium)] text-zinc-200 text-xs font-medium px-3 py-2 hover:bg-[var(--bg-hover)]">
          <Calendar className="w-3.5 h-3.5" /> Schedule
        </Link>
        <Button variant="ghost" size="sm" className="text-xs">
          <StickyNote className="w-3.5 h-3.5 mr-1.5" /> Add note
        </Button>
        {lead.phone ? (
          <>
            <select
              value={outboundCallType || "default"}
              onChange={(e) => setOutboundCallType(e.target.value === "default" ? "" : e.target.value)}
              className="rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-2 py-1.5 text-xs text-zinc-200"
              aria-label="Call type"
            >
              <option value="default">Default</option>
              <option value="lead_followup">Follow-up</option>
              <option value="appointment_reminder">Reminder</option>
            </select>
            <Button variant="primary" size="sm" onClick={() => void onHaveAICall()} disabled={outboundCalling} className="text-xs">
              <Phone className="w-3.5 h-3.5 mr-1.5" /> {outboundCalling ? "Starting…" : "Have AI call"}
            </Button>
          </>
        ) : null}
        <Button variant="secondary" size="sm" onClick={() => onArchive(lead.id)}>
          <Archive className="w-3.5 h-3.5 mr-1.5" /> Archive
        </Button>
      </div>
    </div>
  );
}
