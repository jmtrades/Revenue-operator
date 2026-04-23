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
  Wand2,
  Check,
  Loader2,
} from "lucide-react";

/**
 * Shape returned by `/api/industry/tailor` for custom industries.
 * Kept local to avoid pulling a server-only import into this client comp.
 */
export interface TailoredIndustryPack {
  industry_slug: string;
  industry_name: string;
  default_greeting: string;
  default_faq: { question: string; answer: string }[];
  default_follow_up_cadence: string[];
  voice_tone: string;
  recommended_services: string[];
  ai_generated: true;
}

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
  /**
   * Phase 82 — when user tailors a custom industry via AI, we hand the
   * generated pack back so the caller can persist it server-side via
   * `/api/workspace/industry` (or equivalent) and pre-fill agent config.
   * Optional to preserve backward compatibility with existing call-sites.
   */
  onTailoredPack?: (pack: TailoredIndustryPack) => void;
  selected?: string | null;
  disabled?: boolean;
}

export default function IndustrySelector({
  onSelect,
  onTailoredPack,
  selected,
  disabled,
}: IndustrySelectorProps) {
  const [hovering, setHovering] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Phase 82 — custom/AI-tailored industry state
  const [customIndustry, setCustomIndustry] = useState("");
  const [tailorLoading, setTailorLoading] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [tailoredPack, setTailoredPack] = useState<TailoredIndustryPack | null>(null);

  const handleTailor = async () => {
    const industry = customIndustry.trim();
    if (!industry || industry.length < 2) {
      setTailorError("Enter an industry name (at least 2 characters).");
      return;
    }
    setTailorError(null);
    setTailorLoading(true);
    setTailoredPack(null);
    try {
      const res = await fetch("/api/industry/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        pack?: TailoredIndustryPack;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.pack) {
        setTailorError(data.error ?? "Could not tailor that industry. Try another phrasing.");
        return;
      }
      setTailoredPack(data.pack);
      onSelect(data.pack.industry_slug);
      onTailoredPack?.(data.pack);
    } catch {
      setTailorError("Connection issue — please try again.");
    } finally {
      setTailorLoading(false);
    }
  };

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
    <div className="space-y-4">
      <div>
        <h2 className="font-editorial-small text-white" style={{ fontSize: "1.375rem", lineHeight: 1.2 }}>
          What industry are you in?
        </h2>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          We&apos;ll load scripts, FAQs, and follow-up cadences tuned for your
          business. Don&apos;t see yours? Type it below — our AI will tailor a
          pack in about ten seconds.
        </p>
      </div>

      {/* ─── Phase 82: AI-tailored custom industry ─────────────────────── */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          background: "var(--bg-inset)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-white" />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">
            Tailor for any industry with AI
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customIndustry}
            onChange={(e) => {
              setCustomIndustry(e.target.value);
              if (tailorError) setTailorError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !tailorLoading && !disabled) {
                e.preventDefault();
                handleTailor();
              }
            }}
            placeholder='e.g. "vintage watch restoration" or "commercial beekeeping"'
            disabled={disabled || tailorLoading}
            maxLength={120}
            aria-label="Custom industry name for AI tailoring"
            className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-white placeholder:text-[var(--text-tertiary)] focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleTailor}
            disabled={disabled || tailorLoading || customIndustry.trim().length < 2}
            className="rounded-lg px-4 py-2 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-[background-color,opacity] disabled:opacity-50 whitespace-nowrap"
            style={{
              background: tailoredPack ? "rgba(34,197,94,0.18)" : "white",
              color: tailoredPack ? "#22C55E" : "#09090B",
            }}
          >
            {tailorLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Tailoring…
              </>
            ) : tailoredPack ? (
              <>
                <Check className="w-4 h-4" /> Tailored
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" /> Tailor with AI
              </>
            )}
          </button>
        </div>
        {tailorError && (
          <p className="text-xs" style={{ color: "#F87171" }}>
            {tailorError}
          </p>
        )}
        {tailoredPack && (
          <div className="space-y-2 pt-2 border-t border-[var(--border-default)]">
            <p className="text-xs text-[var(--text-tertiary)]">
              Tailored pack for{" "}
              <span className="text-white font-medium">
                {tailoredPack.industry_name}
              </span>
              :
            </p>
            <ul className="text-xs text-[var(--text-tertiary)] space-y-1 leading-relaxed">
              <li>
                <span className="text-white">Tone:</span>{" "}
                {tailoredPack.voice_tone}
              </li>
              <li>
                <span className="text-white">Services:</span>{" "}
                {tailoredPack.recommended_services.slice(0, 4).join(" · ")}
              </li>
              <li>
                <span className="text-white">FAQs:</span>{" "}
                {tailoredPack.default_faq.length} pre-written answers
              </li>
              <li>
                <span className="text-white">Follow-up:</span>{" "}
                {tailoredPack.default_follow_up_cadence.length}-step cadence
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* ─── Or pick from preset industries ────────────────────────────── */}
      <div className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)] mb-2">
          Or pick a preset
        </p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search industries..."
          className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-2.5 text-sm text-white placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-default)] focus:outline-none focus:ring-1 focus:ring-white/20"
        />
      </div>
      {Object.entries(groupedByCategory).map(([category, industries]) => (
        <div key={category}>
          <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mt-4 mb-2">
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
                    rounded-xl border p-3 text-left transition-[border-color,box-shadow,transform] duration-150
                    ${isSelected
                      ? "border-white bg-[var(--bg-inset)]/80 ring-1 ring-white/20"
                      : isHovering
                        ? "border-[var(--border-default)] bg-[var(--bg-card)]"
                        : "border-[var(--border-default)] bg-[var(--bg-base)]"
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
        <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">
          No match found. Select &quot;Other / General&quot; and we&apos;ll customize for you.
        </p>
      )}
    </div>
  );
}
