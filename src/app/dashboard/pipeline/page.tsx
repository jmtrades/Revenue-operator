"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  GripVertical,
  Plus,
  Phone,
  Globe,
  Users,
  Megaphone,
  DollarSign,
  X,
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

type StageKey = "NEW" | "CONTACTED" | "QUALIFIED" | "BOOKED" | "WON" | "LOST";

interface PipelineCard {
  id: string;
  name: string;
  company: string | null;
  estimatedValue: number;
  daysInStage: number;
  source: "phone" | "web" | "referral" | "campaign";
  stage: StageKey;
}

const STAGES: { key: StageKey; label: string; dotColor: string }[] = [
  { key: "NEW", label: "New", dotColor: "bg-[var(--bg-inset)]" },
  { key: "CONTACTED", label: "Contacted", dotColor: "bg-zinc-400" },
  { key: "QUALIFIED", label: "Qualified", dotColor: "bg-amber-400" },
  { key: "BOOKED", label: "Booked", dotColor: "bg-emerald-400" },
  { key: "WON", label: "Won", dotColor: "bg-emerald-400" },
  { key: "LOST", label: "Lost", dotColor: "bg-red-400" },
];

const DEMO_CARDS: PipelineCard[] = [
  { id: "1", name: "Sarah Johnson", company: "Johnson HVAC", estimatedValue: 4500, daysInStage: 1, source: "phone", stage: "NEW" },
  { id: "2", name: "Marcus Williams", company: "Williams Plumbing", estimatedValue: 2800, daysInStage: 0, source: "phone", stage: "NEW" },
  { id: "3", name: "Dr. Maria Gomez", company: "Smiles Dental", estimatedValue: 8200, daysInStage: 3, source: "web", stage: "CONTACTED" },
  { id: "4", name: "Tom Reynolds", company: "Reynolds Roofing", estimatedValue: 12000, daysInStage: 2, source: "referral", stage: "CONTACTED" },
  { id: "5", name: "Contact A", company: "Organization A", estimatedValue: 15000, daysInStage: 5, source: "phone", stage: "QUALIFIED" },
  { id: "6", name: "Carlos Rivera", company: "RoofGuard Pro", estimatedValue: 6500, daysInStage: 1, source: "campaign", stage: "QUALIFIED" },
  { id: "7", name: "Contact B", company: "Organization B", estimatedValue: 3200, daysInStage: 4, source: "phone", stage: "BOOKED" },
  { id: "8", name: "Contact C", company: "Organization C", estimatedValue: 22000, daysInStage: 7, source: "web", stage: "BOOKED" },
  { id: "9", name: "Kevin Park", company: "Park Dental", estimatedValue: 5400, daysInStage: 12, source: "referral", stage: "WON" },
  { id: "10", name: "Amy Chen", company: "Modern HVAC", estimatedValue: 7800, daysInStage: 3, source: "phone", stage: "WON" },
  { id: "11", name: "Robert Kim", company: null, estimatedValue: 1200, daysInStage: 14, source: "campaign", stage: "LOST" },
];

function sourceIcon(source: PipelineCard["source"]) {
  switch (source) {
    case "phone": return Phone;
    case "web": return Globe;
    case "referral": return Users;
    case "campaign": return Megaphone;
  }
}

export default function PipelinePage() {
  const _t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const [cards, setCards] = useState<PipelineCard[]>(DEMO_CARDS);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<StageKey | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", company: "", value: "" });

  const stageData = useMemo(() => {
    const grouped: Record<StageKey, PipelineCard[]> = {
      NEW: [], CONTACTED: [], QUALIFIED: [], BOOKED: [], WON: [], LOST: [],
    };
    for (const card of cards) {
      grouped[card.stage].push(card);
    }
    return grouped;
  }, [cards]);

  const totalPipeline = useMemo(() => {
    return cards
      .filter((c) => c.stage !== "LOST")
      .reduce((sum, c) => sum + c.estimatedValue, 0);
  }, [cards]);

  const handleDragStart = useCallback((cardId: string) => {
    setDragging(cardId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: StageKey) => {
    e.preventDefault();
    setDragOver(stage);
  }, []);

  const handleDrop = useCallback((stage: StageKey) => {
    if (!dragging) return;
    setCards((prev) =>
      prev.map((c) => (c.id === dragging ? { ...c, stage, daysInStage: 0 } : c))
    );
    setDragging(null);
    setDragOver(null);
  }, [dragging]);

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    setDragOver(null);
  }, []);

  const handleAddLead = useCallback(() => {
    if (!newLead.name.trim()) return;
    const card: PipelineCard = {
      id: `new-${Date.now()}`,
      name: newLead.name.trim(),
      company: newLead.company.trim() || null,
      estimatedValue: parseInt(newLead.value) || 0,
      daysInStage: 0,
      source: "phone",
      stage: "NEW",
    };
    setCards((prev) => [card, ...prev]);
    setNewLead({ name: "", company: "", value: "" });
    setShowAddModal(false);
  }, [newLead]);

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <PageHeader title="Pipeline" subtitle="Visual deal pipeline" />
        <EmptyState icon="pulse" title="Select a workspace" subtitle="Your deal pipeline will appear here." />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Pipeline</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Drag leads between stages. Total pipeline:{" "}
            <span className="font-semibold text-emerald-400">${totalPipeline.toLocaleString()}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs">
            Sample data
          </span>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black text-sm font-semibold px-4 py-2 hover:bg-zinc-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 220px)" }}>
        {STAGES.map((stage) => {
          const stageCards = stageData[stage.key];
          const stageTotal = stageCards.reduce((s, c) => s + c.estimatedValue, 0);
          const isDragTarget = dragOver === stage.key && dragging !== null;

          return (
            <div
              key={stage.key}
              className={`flex-shrink-0 w-72 rounded-2xl border transition-colors ${
                isDragTarget ? "border-emerald-500/50 bg-emerald-500/[0.03]" : ""
              }`}
              style={{
                borderColor: isDragTarget ? undefined : "var(--border-default)",
                background: isDragTarget ? undefined : "var(--bg-surface)",
              }}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(stage.key)}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-default)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stage.dotColor}`} />
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {stage.label}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--bg-inset)] text-[var(--text-tertiary)]">
                      {stageCards.length}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-[var(--text-tertiary)]">
                    ${stageTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-2.5 min-h-[200px]">
                {stageCards.length === 0 && (
                  <p className="text-xs text-center py-6" style={{ color: "var(--text-tertiary)" }}>
                    No leads in this stage
                  </p>
                )}
                {stageCards.map((card) => {
                  const SourceIcon = sourceIcon(card.source);
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => handleDragStart(card.id)}
                      onDragEnd={handleDragEnd}
                      className={`rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all hover:border-[var(--border-default)] ${
                        dragging === card.id ? "opacity-40 scale-95" : ""
                      }`}
                      style={{
                        borderColor: "var(--border-default)",
                        background: "var(--bg-elevated, #1A1A1D)",
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {card.name}
                          </p>
                          {card.company && (
                            <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                              {card.company}
                            </p>
                          )}
                        </div>
                        <GripVertical className="w-4 h-4 flex-shrink-0 text-[var(--text-tertiary)]" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3 h-3 text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-400">
                            ${card.estimatedValue.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <SourceIcon className="w-3 h-3 text-[var(--text-tertiary)]" />
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {card.daysInStage}d
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add lead modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Add Lead to Pipeline
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Name *</span>
                <input
                  type="text"
                  value={newLead.name}
                  onChange={(e) => setNewLead((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Contact name"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Company</span>
                <input
                  type="text"
                  value={newLead.company}
                  onChange={(e) => setNewLead((p) => ({ ...p, company: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Company name"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Estimated Value ($)</span>
                <input
                  type="number"
                  value={newLead.value}
                  onChange={(e) => setNewLead((p) => ({ ...p, value: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="5000"
                />
              </label>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleAddLead}
                disabled={!newLead.name.trim()}
                className="flex-1 rounded-xl bg-emerald-500 text-black font-semibold py-2.5 text-sm hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add to Pipeline
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
