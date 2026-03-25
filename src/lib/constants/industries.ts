/**
 * Broad industry list so no user feels excluded. "Other" first; many options across sectors.
 * Used in onboarding (activate) and Settings → Business.
 */

export const INDUSTRY_OPTIONS: { id: string; label: string }[] = [
  { id: "other", label: "Other / My industry isn't listed" },
  { id: "professional_services", label: "Professional services" },
  { id: "home_services", label: "Home services" },
  { id: "plumbing", label: "Plumbing" },
  { id: "hvac", label: "HVAC" },
  { id: "electrical", label: "Electrical" },
  { id: "roofing", label: "Roofing" },
  { id: "landscaping", label: "Landscaping" },
  { id: "cleaning", label: "Cleaning / Janitorial" },
  { id: "healthcare", label: "Healthcare" },
  { id: "dental", label: "Dental" },
  { id: "medical", label: "Medical practice" },
  { id: "veterinary", label: "Veterinary" },
  { id: "mental_health", label: "Mental health / Therapy" },
  { id: "legal", label: "Legal" },
  { id: "accounting", label: "Accounting / Tax" },
  { id: "real_estate", label: "Real estate" },
  { id: "insurance", label: "Insurance" },
  { id: "financial_services", label: "Financial services" },
  { id: "salon", label: "Salon / Barber" },
  { id: "spa", label: "Spa / Wellness" },
  { id: "fitness", label: "Fitness / Gym" },
  { id: "restaurant", label: "Restaurant" },
  { id: "catering", label: "Catering" },
  { id: "retail", label: "Retail" },
  { id: "auto", label: "Auto repair / Dealership" },
  { id: "property_mgmt", label: "Property management" },
  { id: "construction", label: "Construction" },
  { id: "contractors", label: "Contractors (general)" },
  { id: "education", label: "Education / Training" },
  { id: "nonprofit", label: "Nonprofit" },
  { id: "government", label: "Government" },
  { id: "b2b_sales", label: "B2B / Sales" },
  { id: "tech", label: "Technology / SaaS" },
  { id: "marketing", label: "Marketing / Agency" },
  { id: "events", label: "Events / Entertainment" },
  { id: "travel", label: "Travel / Hospitality" },
  { id: "logistics", label: "Logistics / Delivery" },
  { id: "manufacturing", label: "Manufacturing" },
  { id: "photography", label: "Photography / Creative" },
  { id: "pet_services", label: "Pet services" },
  { id: "childcare", label: "Childcare" },
  { id: "senior_care", label: "Senior care" },
  { id: "moving", label: "Moving / Storage" },
  { id: "security", label: "Security" },
];

const SERVICES_BY_INDUSTRY: Record<string, string[]> = {
  plumbing: ["Drain cleaning", "Water heater", "Leak repair", "Emergency service", "Remodeling"],
  dental: ["New patients", "Cleanings", "Cosmetic", "Emergency", "Follow-up visits"],
  legal: ["Consultations", "Case updates", "Scheduling", "New inquiries"],
  real_estate: ["Buyer leads", "Seller leads", "Showings", "Open houses"],
  insurance: ["New policies", "Claims", "Billing questions", "Renewals"],
  healthcare: ["New patients", "Appointments", "Refills", "Follow-ups"],
  medical: ["Appointments", "Referrals", "Prescriptions", "Results"],
  salon: ["Hair appointments", "Color", "Walk-ins", "Cancellations"],
  auto: ["Repairs", "Oil change", "Diagnostics", "Towing"],
  restaurant: ["Reservations", "Large parties", "Takeout", "Hours"],
  property_mgmt: ["Maintenance", "Leasing", "Tours", "Tenant support"],
  roofing: ["Inspections", "Repairs", "New roof", "Emergency tarping"],
  hvac: ["Installation", "Repair", "Maintenance", "Emergency"],
  electrical: ["Wiring", "Repairs", "Installation", "Inspection"],
  cleaning: ["Residential", "Commercial", "Deep clean", "Recurring"],
  fitness: ["Memberships", "Classes", "Personal training", "Scheduling"],
  veterinary: ["Appointments", "Vaccinations", "Emergency", "Boarding"],
  accounting: ["Tax prep", "Consulting", "Bookkeeping", "Appointments"],
  construction: ["Estimates", "Scheduling", "Project updates", "Permits"],
  education: ["Enrollment", "Scheduling", "Inquiries", "Support"],
};

const GENERIC_SERVICES = ["New inquiries", "Appointments", "Support", "Follow-ups", "Scheduling", "Callbacks"];

/** Returns suggested services for an industry; falls back to generic list so any industry is supported. */
export function getServicesForIndustry(industryId: string | null): string[] {
  if (!industryId) return GENERIC_SERVICES;
  return SERVICES_BY_INDUSTRY[industryId] ?? GENERIC_SERVICES;
}

export function getIndustryLabel(industryId: string | null): string {
  if (!industryId) return "your business";
  return INDUSTRY_OPTIONS.find((i) => i.id === industryId)?.label ?? "your business";
}
