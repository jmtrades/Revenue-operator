"use client";

import { useState } from "react";

/**
 * Extended industry list for onboarding.
 * Maps to industry_templates slugs in the database.
 */
const INDUSTRIES = [
  { slug: "dental", name: "Dental", icon: "🦷" },
  { slug: "plumbing-hvac", name: "Plumbing & HVAC", icon: "🔧" },
  { slug: "legal", name: "Legal", icon: "⚖️" },
  { slug: "healthcare", name: "Healthcare / Med Spa", icon: "🏥" },
  { slug: "real-estate", name: "Real Estate", icon: "🏠" },
  { slug: "roofing", name: "Roofing", icon: "🏗️" },
  { slug: "recruiting", name: "Recruiting", icon: "👥" },
  { slug: "coaching", name: "Coaching / Consulting", icon: "🎯" },
  { slug: "beauty-wellness", name: "Beauty & Wellness", icon: "💆" },
  { slug: "automotive", name: "Automotive Service", icon: "🚗" },
  { slug: "education", name: "Education", icon: "📚" },
  { slug: "restoration", name: "Restoration", icon: "🏚️" },
  { slug: "other", name: "Other", icon: "💼" },
] as const;

interface IndustrySelectorProps {
  onSelect: (slug: string) => void;
  selected?: string | null;
  disabled?: boolean;
}

export default function IndustrySelector({ onSelect, selected, disabled }: IndustrySelectorProps) {
  const [hovering, setHovering] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">What industry are you in?</h2>
      <p className="text-sm text-zinc-400">We&apos;ll load scripts, templates, and follow-up cadences tuned for your business.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
        {INDUSTRIES.map((ind) => {
          const isSelected = selected === ind.slug;
          const isHovering = hovering === ind.slug;
          return (
            <button
              key={ind.slug}
              onClick={() => !disabled && onSelect(ind.slug)}
              onMouseEnter={() => setHovering(ind.slug)}
              onMouseLeave={() => setHovering(null)}
              disabled={disabled}
              className={`
                rounded-xl border p-4 text-left transition-all duration-150
                ${isSelected
                  ? "border-white bg-zinc-800/80 ring-1 ring-white/20"
                  : isHovering
                    ? "border-zinc-600 bg-zinc-900"
                    : "border-zinc-800 bg-zinc-950"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <div className="text-xl mb-1">{ind.icon}</div>
              <h3 className="text-white font-medium text-sm">{ind.name}</h3>
            </button>
          );
        })}
      </div>
    </div>
  );
}
