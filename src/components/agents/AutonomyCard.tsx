"use client";

/**
 * Phase 4 — Autonomy + confidence threshold controls.
 *
 * Surfaces two complementary levers for the operator:
 *   1. Autonomy mode (observe / suggest / assisted / auto) — *what* the
 *      agent is allowed to do.
 *   2. Confidence threshold (0-100) — *how sure* the agent needs to be
 *      before acting without human review.
 *
 * The values are persisted via the parent form; this component is a dumb
 * controlled widget, so it can slot into any settings surface.
 */

import { useMemo } from "react";
import { ShieldCheck, Eye, Sparkles, Zap, Info } from "lucide-react";

export type AutonomyMode = "observe" | "suggest" | "assisted" | "auto";

export interface AutonomyCardProps {
  autonomy: AutonomyMode;
  onChangeAutonomy: (next: AutonomyMode) => void;
  confidence: number;
  onChangeConfidence: (next: number) => void;
  disabled?: boolean;
}

interface ModeMeta {
  id: AutonomyMode;
  label: string;
  sub: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MODES: readonly ModeMeta[] = [
  {
    id: "observe",
    label: "Observe",
    sub: "Listen only",
    helper: "Agent joins calls and records insight but never speaks or acts.",
    icon: Eye,
  },
  {
    id: "suggest",
    label: "Suggest",
    sub: "Draft, don't send",
    helper: "Agent drafts replies and next steps; a human must approve before they go out.",
    icon: Sparkles,
  },
  {
    id: "assisted",
    label: "Assisted",
    sub: "Act with guardrails",
    helper: "Agent handles routine calls and transfers anything outside its comfort zone.",
    icon: ShieldCheck,
  },
  {
    id: "auto",
    label: "Auto",
    sub: "Full operator",
    helper: "Agent books, follows up, and closes loops on its own. Escalates only on true exceptions.",
    icon: Zap,
  },
];

export function AutonomyCard({
  autonomy,
  onChangeAutonomy,
  confidence,
  onChangeConfidence,
  disabled,
}: AutonomyCardProps) {
  const confidenceLabel = useMemo(() => {
    if (confidence >= 85) return "Very conservative — transfer often";
    if (confidence >= 70) return "Conservative";
    if (confidence >= 50) return "Balanced";
    if (confidence >= 30) return "Assertive";
    return "Very assertive — let the AI handle most cases";
  }, [confidence]);

  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 md:p-6">
      <header className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Autonomy &amp; confidence
        </h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Control how much your AI agent does on its own and when it asks for
          help.
        </p>
      </header>

      <fieldset
        className="grid gap-2 sm:grid-cols-2"
        disabled={disabled}
        aria-label="Autonomy mode"
      >
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = autonomy === m.id;
          return (
            <label
              key={m.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-colors ${
                active
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
                  : "border-[var(--border-default)] hover:border-[var(--border-medium)]"
              }`}
            >
              <input
                type="radio"
                name="autonomy-mode"
                value={m.id}
                checked={active}
                onChange={() => onChangeAutonomy(m.id)}
                className="sr-only"
              />
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  active
                    ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                    : "bg-[var(--bg-inset)] text-[var(--text-secondary)]"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-semibold ${
                    active ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
                  }`}
                >
                  {m.label}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
                  {m.sub}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {m.helper}
                </p>
              </div>
            </label>
          );
        })}
      </fieldset>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <label
            htmlFor="confidence-threshold"
            className="text-sm font-semibold text-[var(--text-primary)]"
          >
            Confidence threshold
          </label>
          <span className="text-sm font-semibold tabular-nums text-[var(--accent-primary)]">
            {confidence}%
          </span>
        </div>
        <input
          id="confidence-threshold"
          type="range"
          min={0}
          max={100}
          step={5}
          value={confidence}
          onChange={(e) => onChangeConfidence(Number(e.target.value))}
          disabled={disabled}
          className="mt-2 w-full accent-[var(--accent-primary)]"
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
          <span>Assertive</span>
          <span>Balanced</span>
          <span>Conservative</span>
        </div>
        <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
          {confidenceLabel}. Below this confidence, the agent will ask for help or transfer.
        </p>
      </div>
    </section>
  );
}
