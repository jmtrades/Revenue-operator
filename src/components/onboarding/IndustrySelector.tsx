"use client";

import { useState, useMemo } from "react";
import {
  Stethoscope,
  Syringe,
  Activity,
  PawPrint,
  Pill,
  Dumbbell,
  Thermometer,
  Wrench,
  Zap,
  HardHat,
  Hammer,
  Sun,
  Sparkles,
  TreePine,
  Home,
  Scale,
  BarChart3,
  DollarSign,
  Shield,
  Building2,
  Users,
  UtensilsCrossed,
  Scissors,
  Car,
  Camera,
  Plane,
  ShoppingCart,
  GraduationCap,
  Briefcase,
} from "lucide-react";

/**
 * Complete industry list for onboarding.
 * Slugs map to INDUSTRY_PACKS keys so the correct pack auto-loads.
 * Grouped by category for easier browsing.
 */
const INDUSTRIES = [
  // Healthcare & Wellness
  { slug: "dental", name: "Dental", icon: Stethoscope, category: "Health" },
  { slug: "healthcare", name: "Healthcare", icon: Stethoscope, category: "Health" },
  { slug: "medspa", name: "Med Spa", icon: Syringe, category: "Health" },
  { slug: "chiropractor", name: "Chiropractic", icon: Activity, category: "Health" },
  { slug: "veterinary", name: "Veterinary", icon: PawPrint, category: "Health" },
  { slug: "pharmacy", name: "Pharmacy", icon: Pill, category: "Health" },
  { slug: "fitness", name: "Fitness / Gym", icon: Dumbbell, category: "Health" },

  // Home Services
  { slug: "hvac", name: "HVAC", icon: Thermometer, category: "Home" },
  { slug: "plumbing", name: "Plumbing", icon: Wrench, category: "Home" },
  { slug: "electrical", name: "Electrical", icon: Zap, category: "Home" },
  { slug: "roofing", name: "Roofing", icon: HardHat, category: "Home" },
  { slug: "contractor", name: "General Contractor", icon: Hammer, category: "Home" },
  { slug: "solar", name: "Solar", icon: Sun, category: "Home" },
  { slug: "cleaning", name: "Cleaning Service", icon: Sparkles, category: "Home" },
  { slug: "landscaping", name: "Landscaping", icon: TreePine, category: "Home" },
  { slug: "home_services", name: "Home Services (Other)", icon: Home, category: "Home" },

  // Professional Services
  { slug: "legal", name: "Legal", icon: Scale, category: "Professional" },
  { slug: "accounting", name: "Accounting / CPA", icon: BarChart3, category: "Professional" },
  { slug: "financial_services", name: "Financial Services", icon: DollarSign, category: "Professional" },
  { slug: "insurance", name: "Insurance", icon: Shield, category: "Professional" },
  { slug: "real_estate", name: "Real Estate", icon: Home, category: "Professional" },
  { slug: "property_management", name: "Property Management", icon: Building2, category: "Professional" },
  { slug: "recruiting", name: "Recruiting / Staffing", icon: Users, category: "Professional" },

  // Consumer & Retail
  { slug: "restaurant", name: "Restaurant / Food", icon: UtensilsCrossed, category: "Consumer" },
  { slug: "beauty_salon", name: "Beauty Salon / Spa", icon: Scissors, category: "Consumer" },
  { slug: "auto_repair", name: "Auto Repair", icon: Car, category: "Consumer" },
  { slug: "photography", name: "Photography", icon: Camera, category: "Consumer" },
  { slug: "pet_grooming", name: "Pet Grooming", icon: PawPrint, category: "Consumer" },
  { slug: "travel", name: "Travel Agency", icon: Plane, category: "Consumer" },
  { slug: "ecommerce", name: "E-Commerce", icon: ShoppingCart, category: "Consumer" },
  { slug: "education", name: "Education / Tutoring", icon: GraduationCap, category: "Consumer" },

  // General
  { slug: "general", name: "Other / General", icon: Briefcase, category: "General" },
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
                  <div className="mb-0.5">
                    <ind.icon className="w-5 h-5 text-white" />
                  </div>
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
