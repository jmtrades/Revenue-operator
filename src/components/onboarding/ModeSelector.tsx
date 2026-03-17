"use client";

import { useState } from "react";

const MODES = [
  {
    id: "solo" as const,
    title: "Solo",
    description: "Personal follow-up, invoice recovery, relationship reminders",
    icon: "👤",
    examples: "Freelancers, consultants, creators, coaches",
  },
  {
    id: "sales" as const,
    title: "Sales Team",
    description: "Setters, closers, pipeline execution, deal follow-up",
    icon: "📈",
    examples: "Sales teams, agencies, high-ticket orgs",
  },
  {
    id: "business" as const,
    title: "Service Business",
    description: "Inbound calls, booking, no-show recovery, reactivation",
    icon: "🏢",
    examples: "Dental, HVAC, legal, med spa, real estate",
  },
] as const;

type Mode = (typeof MODES)[number]["id"];

interface ModeSelectorProps {
  onSelect: (mode: Mode) => void;
  selected?: Mode | null;
  disabled?: boolean;
}

export default function ModeSelector({ onSelect, selected, disabled }: ModeSelectorProps) {
  const [hovering, setHovering] = useState<Mode | null>(null);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">How will you use Recall Touch?</h2>
      <p className="text-sm text-zinc-400">This customizes your dashboard, templates, and default settings.</p>
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        {MODES.map((m) => {
          const isSelected = selected === m.id;
          const isHovering = hovering === m.id;
          return (
            <button
              key={m.id}
              onClick={() => !disabled && onSelect(m.id)}
              onMouseEnter={() => setHovering(m.id)}
              onMouseLeave={() => setHovering(null)}
              disabled={disabled}
              className={`
                rounded-2xl border p-5 text-left transition-all duration-150
                ${isSelected
                  ? "border-white bg-zinc-800/80 ring-1 ring-white/20"
                  : isHovering
                    ? "border-zinc-600 bg-zinc-900"
                    : "border-zinc-800 bg-zinc-950"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <div className="text-2xl mb-2">{m.icon}</div>
              <h3 className="text-white font-semibold text-base mb-1">{m.title}</h3>
              <p className="text-sm text-zinc-400 mb-3">{m.description}</p>
              <p className="text-xs text-zinc-500">{m.examples}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
