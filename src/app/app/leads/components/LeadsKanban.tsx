"use client";

import { useTranslations } from "next-intl";
import { useDraggable, useDroppable, DndContext, type DragEndEvent } from "@dnd-kit/core";
import type { LeadView } from "../page";

export type LeadStatus = "New" | "Contacted" | "Qualified" | "Appointment Set" | "Won" | "Lost";

const STATUS_ORDER: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Appointment Set",
  "Won",
  "Lost",
];

const SCORE_COLORS: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  medium: "bg-amber-500/15 text-amber-200 border-amber-500/40",
  low: "bg-rose-500/15 text-rose-200 border-rose-500/40",
  all: "bg-[var(--bg-card)] text-zinc-300 border-[var(--border-medium)]",
};

function scoreBucket(score: number): string {
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

function BoardCard({ lead, onOpen, t }: { lead: LeadView; onOpen: () => void; t: (k: string, p?: { count?: number }) => string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  const sb = scoreBucket(lead.score);
  const scoreClass = SCORE_COLORS[sb];
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className={`w-full text-left rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-xs hover:border-[var(--border-medium)] cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
    >
      <p className="font-medium text-zinc-100 truncate">{lead.name}</p>
      <p className="text-[11px] text-zinc-400">{lead.phone}</p>
      <p className="text-[11px] text-zinc-500 truncate">{lead.service}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${scoreClass}`}>
          <span>{lead.score}</span>
        </span>
        <span className="text-[11px] text-zinc-500">{timeSince(lead.createdAt, t)}</span>
      </div>
    </div>
  );
}

function BoardColumn({
  status,
  columnLeads,
  onOpenLead,
  t,
}: {
  status: LeadStatus;
  columnLeads: LeadView[];
  onOpenLead: (lead: LeadView) => void;
  t: (k: string, p?: { count?: number }) => string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 min-h-[220px] transition-colors ${isOver ? "ring-2 ring-[var(--accent-primary)]/50" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-zinc-200">{status}</p>
        <span className="text-[11px] text-zinc-500">{columnLeads.length}</span>
      </div>
      <div className="space-y-2 overflow-y-auto min-h-0">
        {columnLeads.map((lead) => (
          <BoardCard key={lead.id} lead={lead} onOpen={() => onOpenLead(lead)} t={t} />
        ))}
        {columnLeads.length === 0 && (
          <p className="text-[11px] text-zinc-600">No leads in this stage yet.</p>
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
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
