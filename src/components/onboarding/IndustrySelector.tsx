"use client";

import { useState, useMemo } from "react";

/**
 * Complete industry list for onboarding.
 * Slugs map to INDUSTRY_PACKS keys so the correct pack auto-loads.
 * Grouped by category for easier browsing.
 */
const INDUSTRIES = [
  // Healthcare & Wellness
  { slug: "dental", name: "Dental", icon: "🦷", category: "Health" },
  { slug: "healthcare", name: "Healthcare", icon: "🏥", category: "Health" },
  { slug: "medspa", name: "Med Spa", icon: "💉", category: "Health" },
  { slug: "chiropractor", name: "Chiropractic", icon: "🦴", category: "Health" },
  { slug: "veterinary", name: "Veterinary", icon: "🐾", category: "Health" },
  { slug: "pharmacy", name: "Pharmacy", icon: "💊", category: "Health" },
  { slug: "fitness", name: "Fitness / Gym", icon: "💪", category: "Health" },

  // Home Services
  { slug: "hvac", name: "HVAC", icon: "❄️", category: "Home" },
  { slug: "plumbing", name: "Plumbing", icon: "🔧", category: "Home" },
  { slug: "electrical", name: "Electrical", icon: "⚡", category: "Home" },
  { slug: "roofing", name: "Roofing", icon: "🏗️", category: "Home" },
  { slug: "contractor", name: "General Contractor", icon: "🔨", category: "Home" },
  { slug: "solar", name: "Solar", icon: "☀️", category: "Home" },
  { slug: "cleaning", name: "Cleaning Service", icon: "🧹", category: "Home" },
  { slug: "landscaping", name: "Landscaping", icon: "🌿", category: "Home" },
  { slug: "home_services", name: "Home Services (Other)", icon: "🏠", category: "Home" },

  // Professional Services
  { slug: "legal", name: "Legal", icon: "⚖️", category: "Professional" },
  { slug: "accounting", name: "Accounting / CPA", icon: "📊", category: "Professional" },
  { slug: "financial_services", name: "Financial Services", icon: "💰", category: "Professional" },
  { slug: "insurance", name: "Insurance", icon: "🛡️", category: "Professional" },
  { slug: "real_estate", name: "Real Estate", icon: "🏡", category: "Professional" },
  { slug: "property_management", name: "Property Management", icon: "🏢", category: "Professional" },
  { slug: "recruiting", name: "Recruiting / Staffing", icon: "👥", category: "Professional" },

  // Consumer & Retail
  { slug: "restaurant", name: "Restaurant / Food", icon: "🍽️", category: "Consumer" },
  { slug: "beauty_salon", name: "Beauty Salon / Spa", icon: "💇", category: "Consumer" },
  { slug: "auto_repair", name: "Auto Repair", icon: "🚗", category: "Consumer" },
  { slug: "photography", name: "Photography", icon: "📸", category: "Consumer" },
  { slug: "pet_grooming", name: "Pet Grooming", icon: "🐕", category: "Consumer" },
  { slug: "travel", name: "Travel Agency", icon: "✈️", category: "Consumer" },
  { slug: "ecommerce", name: "E-Commerce", icon: "🛒", category: "Consumer" },
  { slug: "education", name: "Education / Tutoring", icon: "📚", category: "Consumer" },

  // General
  { slug: "general", name: "Other / General", icon: "💼", category: "General" },
] as const;

const CATEGORIES = ["Health", "Home", "Professional", "Consumer", "General"] as const;

interface IndustrySelectorProps {
  onSelect: (slug: string) => void;
  selected?: string | null;
  disabled?: boolean;
}

export default function IndustrySelector({ onSelect, selected, disabled }: IndustrySelectorProps) {
  const [hovering, setHovering] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return INDUSTRIES;
    const q = search.toLowerCase();
    return INDUSTRIES.filter(
      (ind) =>
        ind.name.toLowerCase().includes(q) ||
        ind.slug.toLowerCase().includes(q) ||
        ind.category.toLowerCase().includes(q)
    );
  }, [search]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const cat of CATEGORIES) {
      const items = filtered.filter((i) => i.category === cat);
      if (items.length > 0) groups[cat] = items;
    }
    return groups;
  }, [filtered]);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white">What industry are you in?</h2>
      <p className="text-sm text-zinc-400">
        We&apos;ll load scripts, templates, and follow-up cadences tuned for your business.
      </p>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search industries..."
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20"
      />
      {Object.entries(groupedByCategory).map(([category, industries]) => (
        <div key={category}>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-4 mb-2">
            {category}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {industries.map((ind) => {
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
                    rounded-xl border p-3 text-left transition-all duration-150
                    ${isSelected
                      ? "border-white bg-zinc-800/80 ring-1 ring-white/20"
                      : isHovering
                        ? "border-zinc-600 bg-zinc-900"
                        : "border-zinc-800 bg-zinc-950"
                    }
                    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  <div className="text-lg mb-0.5">{ind.icon}</div>
                  <h3 className="text-white font-medium text-xs leading-tight">{ind.name}</h3>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {filtered.length === 0 && (
        <p className="text-sm text-zinc-500 py-4 text-center">
          No match found. Select &quot;Other / General&quot; and we&apos;ll customize for you.
        </p>
      )}
    </div>
  );
}
