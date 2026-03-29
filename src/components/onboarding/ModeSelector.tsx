"use client";

import { useState } from "react";
import { User, TrendingUp, Building2 } from "lucide-react";

const MODES = [
  {
    id: "solo" as const,
    title: "Solo",
    description: "Personal follow-up, invoice recovery, relationship reminders",
    icon: "user",
    examples: "Freelancers, consultants, creators, coaches",
  },
  {
    id: "sales" as const,
    title: "Sales Team",
    description: "Setters, closers, pipeline execution, deal follow-up",
    icon: "trending-up",
    examples: "Sales teams, agencies, high-ticket orgs",
  },
  {
    id: "business" as const,
    title: "Service Business",
    description: "Inbound calls, booking, no-show recovery, reactivation",
    icon: "building2",
    examples: "Dental, HVAC, legal, med spa, real estate",
  },
] as const;

const getIconComponent = (iconType: string) => {
  switch (iconType) {
    case "user":
      return User;
    case "trending-up":
      return TrendingUp;
    case "building2":
      return Building2;
    default:
      return User;
  }
};

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
      <h2 className="text-lg font-semibold text-white">How will you use Revenue Operator?</h2>
      <p className="text-sm text-[var(--text-tertiary)]">This customizes your dashboard, templates, and default settings.</p>
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
                rounded-2xl border p-5 text-left transition-[border-color,box-shadow,transform] duration-150
                ${isSelected
                  ? "border-white bg-[var(--bg-inset)]/80 ring-1 ring-white/20"
                  : isHovering
                    ? "border-[var(--border-default)] bg-[var(--bg-card)]"
                    : "border-[var(--border-default)] bg-[var(--bg-base)]"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <div className="mb-2">
                {(() => {
                  const IconComponent = getIconComponent(m.icon);
                  return <IconComponent className="w-6 h-6 text-white" />;
                })()}
              </div>
              <h3 className="text-white font-semibold text-base mb-1">{m.title}</h3>
              <p className="text-sm text-[var(--text-tertiary)] mb-3">{m.description}</p>
              <p className="text-xs text-[var(--text-tertiary)]">{m.examples}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
