"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useDraggable, useDroppable, DndContext, type DragEndEvent } from "@dnd-kit/core";
import type { LeadView } from "../page";

interface KanbanIntelligence {
  urgency_score: number;
  intent_score: number;
  engagement_score: number;
  next_best_action: string;
  risk_flags: string[];
  conversion_probability: number;
}

function getTemp(u: number, i: number, e: number): { label: string; color: string } {
  const avg = (u + i + e) / 3;
  if (avg >= 70) return { label: "Hot", color: "bg-red-500" };
  if (avg >= 50) return { label: "Warm", color: "bg-orange-500" };
  if (avg >= 30) return { label: "Cool", color: "bg-blue-500" };
  return { label: "Cold", color: "bg-gray-500" };
}

export type LeadStatus = "New" | "Contacted" | "Qualified" | "Appointment Set" | "Won" | "Lost";

const STATUS_ORDER: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Appointment Set",
  "Won",
  "Lost",
];

const STATUS_KEY: Record<LeadStatus, string> = {
  "New": "status.new",
  "Contacted": "status.contacted",
  "Qualified": "status.qualified",
  "Appointment Set": "status.appointmentSet",
  "Won": "status.won",
  "Lost": "status.lost",
};

function getStatusLabel(status: LeadStatus, t: (k: string) => string): string {
  return t(STATUS_KEY[status]) || status;
}

const SCORE_COLORS: Record<string, string> = {
  high: "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/40",
  medium: "bg-[var(--accent-warning,#f59e0b)]/15 text-[var(--accent-warning,#f59e0b)] border-[var(--accent-warning,#f59e0b)]/40",
  low: "bg-[var(--accent-danger,#ef4444)]/15 text-[var(--accent-danger,#ef4444)] border-[var(--accent-danger,#ef4444)]/40",
  all: "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-medium)]",
};

function scoreBucket(score: number | null): string {
  if (score === null) return "low";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function timeSince(iso: string, t: (k: string, p?: { count?: number }) => string): string {
  const d = new Date(iso).getTime();
  const diffMs = Date.now() - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return t("timeToday");
  if (diffDays === 1) return t("timeOneDayAgo");
  if (diffDays < 7) return t("timeDaysAgo", { count: diffDays });
  const weeks = Math.floor(diffDays / 7);
  if (weeks === 1) return t("timeOneWeekAgo");
  return t("timeWeeksAgo", { count: weeks });
}

function BoardCard({ lead, onOpen, t, intel }: { lead: LeadView; onOpen: () => void; t: (k: string, p?: { count?: number }) => string; intel?: KanbanIntelligence | null }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  const sb = scoreBucket(lead.score);
  const scoreClass = SCORE_COLORS[sb];
  const temp = intel ? getTemp(intel.urgency_score, intel.intent_score, intel.engagement_score) : null;
  const hasRisk = intel?.risk_flags?.some((f) => f === "anger" || f === "opt_out" || f === "going_cold");

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className={`w-full text-left rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs hover:border-[var(--border-medium)] cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""} ${hasRisk ? "border-red-500/30" : ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="font-medium text-[var(--text-primary)] truncate">{lead.name}</p>
        {temp && (
          <span className={`h-2 w-2 shrink-0 rounded-full ${temp.color}`} title={temp.label} />
        )}
      </div>
      <p className="text-[11px] text-[var(--text-tertiary)]">{lead.phone}</p>
      {intel ? (
        <p className="text-[11px] text-[var(--text-secondary)] truncate">{intel.next_best_action}</p>
      ) : (
        <p className="text-[11px] text-[var(--text-secondary)] truncate">{lead.service}</p>
      )}
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${scoreClass}`}>
          <span>{lead.score ?? "—"}</span>
        </span>
        {intel ? (
          <span className="text-[11px] text-emerald-400 font-medium">{(intel.conversion_probability * 100).toFixed(0)}%</span>
        ) : (
          <span className="text-[11px] text-[var(--text-secondary)]">{timeSince(lead.createdAt, t)}</span>
        )}
      </div>
    </div>
  );
}

function BoardColumn({
  status,
  columnLeads,
  onOpenLead,
  t,
  intelligence,
}: {
  status: LeadStatus;
  columnLeads: LeadView[];
  onOpenLead: (lead: LeadView) => void;
  t: (k: string, p?: { count?: number }) => string;
  intelligence: Record<string, KanbanIntelligence>;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 min-h-[220px] transition-colors ${isOver ? "ring-2 ring-[var(--accent-primary)]/50" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-[var(--text-primary)]">{getStatusLabel(status, t)}</p>
        <span className="text-[11px] text-[var(--text-secondary)]">{columnLeads.length}</span>
      </div>
      <div className="space-y-2 overflow-y-auto min-h-0">
        {columnLeads.map((lead) => (
          <BoardCard key={lead.id} lead={lead} onOpen={() => onOpenLead(lead)} t={t} intel={intelligence[lead.id]} />
        ))}
        {columnLeads.length === 0 && (
          <p className="text-[11px] text-[var(--text-tertiary)]">{t("noLeadsInStage")}</p>
        )}
      </div>
    </div>
  );
}

export type LeadsKanbanProps = {
  groupedByStatus: Map<LeadStatus, LeadView[]>;
  onMoveLead: (leadId: string, newStatus: LeadStatus) => void;
  onOpenLead: (lead: LeadView) => void;
};

export function LeadsKanban({ groupedByStatus, onMoveLead, onOpenLead }: LeadsKanbanProps) {
  const t = useTranslations("leads");
  const [intelligence, setIntelligence] = useState<Record<string, KanbanIntelligence>>({});
  const fetchedRef = useRef<string>("");

  // Collect all lead IDs from all columns
  const allLeadIds: string[] = [];
  for (const leads of groupedByStatus.values()) {
    for (const lead of leads) allLeadIds.push(lead.id);
  }

  useEffect(() => {
    const key = allLeadIds.slice().sort().join(",");
    if (!key || key === fetchedRef.current) return;
    fetchedRef.current = key;

    fetch("/api/leads/intelligence/batch", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_ids: allLeadIds.slice(0, 50) }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json && typeof json === "object") {
          const valid: Record<string, KanbanIntelligence> = {};
          for (const [k, v] of Object.entries(json)) {
            if (v && typeof v === "object" && "urgency_score" in (v as Record<string, unknown>)) {
              valid[k] = v as KanbanIntelligence;
            }
          }
          setIntelligence(valid);
        }
      })
      .catch((e) => { console.warn("[LeadsKanban] failed:", e instanceof Error ? e.message : String(e)); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLeadIds.length]);

  return (
    <div className="hidden md:block mt-6">
      <DndContext
        onDragEnd={(event: DragEndEvent) => {
          const { active, over } = event;
          if (!over || active.id === over.id) return;
          const leadId = String(active.id);
          const newStatus = STATUS_ORDER.includes(over.id as LeadStatus)
            ? (over.id as LeadStatus)
            : null;
          if (newStatus) onMoveLead(leadId, newStatus);
        }}
      >
        <div className="grid grid-cols-3 xl:grid-cols-6 gap-4">
          {STATUS_ORDER.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              columnLeads={groupedByStatus.get(status) ?? []}
              onOpenLead={onOpenLead}
              t={t}
              intelligence={intelligence}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
