/**
 * Industry-specific content for /industries/[slug] pages.
 * Add new industries here; the template and route will pick them up.
 */

export interface IndustryProblemStat {
  value: string;
  description: string;
  icon: string;
}

export interface IndustryHowItWorksStep {
  title: "Connect" | "Teach" | "Relax";
  description: string;
}

export interface IndustryCapability {
  title: string;
  description: string;
  icon: string;
}

export interface IndustryROI {
  missedCallsPerWeek: number;
  avgValueLabel: string;
  avgValueNumber: number;
  recoveredPerMonth: number;
  paybackDays?: number;
}

export interface IndustryData {
  slug: string;
  name: string;
  customerType: string;
  heroIcon: string;
  problemStats: IndustryProblemStat[];
  howItWorks: IndustryHowItWorksStep[];
  capabilities: IndustryCapability[];
  roi: IndustryROI;
  ctaHeadline: string;
}

export const INDUSTRY_SLUGS = [
  "plumbing-hvac",
  "dental",
  "legal",
  "real-estate",
  "healthcare",
] as const;

export type IndustrySlug = (typeof INDUSTRY_SLUGS)[number];

const INDUSTRIES_DATA: Record<IndustrySlug, IndustryData> = {
  "plumbing-hvac": {
    slug: "plumbing-hvac",
    name: "Plumbing & HVAC",
    customerType: "service call",
    heroIcon: "Wrench",
    problemStats: [
      {
        value: "62%",
        description: "of homeowners call the first plumber they find",
        icon: "Phone",
      },
      {
        value: "$350",
        description: "Average emergency plumbing job",
        icon: "DollarSign",
      },
      {
        value: "$4,200/mo",
        description: "Lost from missed calls (avg 3/day)",
        icon: "TrendingDown",
      },
    ],
    howItWorks: [
      {
        title: "Connect",
        description: "Forward your business line or get a dedicated number. Every emergency and routine call reaches your AI agent in seconds.",
      },
      {
        title: "Teach",
        description: "Set your service area, rates, and availability. Your agent knows what you offer and when you can show up.",
      },
      {
        title: "Relax",
        description: "Calls get answered 24/7. Jobs get scheduled, quotes get captured, and you get a clear summary without picking up the phone.",
      },
    ],
    capabilities: [
      {
        title: "Emergency dispatch",
        description: "Prioritize urgent calls and capture address, issue, and callback details so you can respond fast.",
        icon: "Zap",
      },
      {
        title: "Appointment scheduling",
        description: "Book service windows and follow-up visits in one conversation. Syncs with your calendar.",
        icon: "Calendar",
      },
      {
        title: "Service area verification",
        description: "Confirm the caller is in your coverage area and set expectations before you roll a truck.",
        icon: "MapPin",
      },
      {
        title: "Quote requests",
        description: "Gather job details and ballpark ranges so you show up prepared and close more work.",
        icon: "Calculator",
      },
    ],
    roi: {
      missedCallsPerWeek: 12,
      avgValueLabel: "avg job",
      avgValueNumber: 350,
      recoveredPerMonth: 4200,
      paybackDays: 3,
    },
    ctaHeadline: "Start your free Plumbing & HVAC AI agent in 5 minutes",
  },
  dental: {
    slug: "dental",
    name: "Dental",
    customerType: "patient",
    heroIcon: "Smile",
    problemStats: [
      {
        value: "67%",
        description: "of patients call a competitor if you don't answer in 3 rings",
        icon: "PhoneMissed",
      },
      {
        value: "$1,200/yr",
        description: "Average new patient value",
        icon: "DollarSign",
      },
      {
        value: "35%",
        description: "of calls to dental offices go unanswered",
        icon: "TrendingDown",
      },
    ],
    howItWorks: [
      {
        title: "Connect",
        description: "Connect your practice phone number. New-patient and recall calls are answered in your practice name, day or night.",
      },
      {
        title: "Teach",
        description: "Add your services, insurance accepted, and hours. Your agent books exams, cleanings, and follow-ups the way you want.",
      },
      {
        title: "Relax",
        description: "Fewer no-shows with automated reminders. Full intake and scheduling without front-desk overload.",
      },
    ],
    capabilities: [
      {
        title: "Appointment booking",
        description: "Schedule new patients and recall appointments in one call. Confirm insurance and collect key details.",
        icon: "Calendar",
      },
      {
        title: "Insurance verification",
        description: "Capture insurance info and set expectations so front desk can verify before the visit.",
        icon: "Shield",
      },
      {
        title: "Recall reminders",
        description: "Automated recall and appointment reminders so patients show up and rebook.",
        icon: "Phone",
      },
      {
        title: "Emergency triage",
        description: "After-hours pain and emergency calls get answered and triaged so you know who needs urgent care.",
        icon: "AlertCircle",
      },
    ],
    roi: {
      missedCallsPerWeek: 8,
      avgValueLabel: "patient value",
      avgValueNumber: 1200,
      recoveredPerMonth: 9600,
      paybackDays: 2,
    },
    ctaHeadline: "Start your free Dental AI agent in 5 minutes",
  },
  legal: {
    slug: "legal",
    name: "Legal",
    customerType: "potential client",
    heroIcon: "Scale",
    problemStats: [
      {
        value: "79%",
        description: "of legal clients hire the first firm that responds",
        icon: "Clock",
      },
      {
        value: "$4,500",
        description: "Average case value",
        icon: "DollarSign",
      },
      {
        value: "42%",
        description: "of law firm calls go to voicemail",
        icon: "PhoneMissed",
      },
    ],
    howItWorks: [
      {
        title: "Connect",
        description: "Forward your firm number or use a dedicated line. Every intake and referral call is answered professionally.",
      },
      {
        title: "Teach",
        description: "Define practice areas, conflict rules, and intake questions. Your agent screens and captures details for your team.",
      },
      {
        title: "Relax",
        description: "Every call documented. Consultations scheduled. You focus on billable work while the phone is covered 24/7.",
      },
    ],
    capabilities: [
      {
        title: "Intake screening",
        description: "Structured intake that captures matter type, key facts, and contact info for conflict checks and follow-up.",
        icon: "ClipboardList",
      },
      {
        title: "Conflict check routing",
        description: "Gather party names and matter details so you can run conflicts before the first callback.",
        icon: "Shield",
      },
      {
        title: "Appointment booking",
        description: "Schedule consultations and callbacks at times that work for both the lead and your calendar.",
        icon: "Calendar",
      },
      {
        title: "After-hours line",
        description: "Urgent calls get a professional response and escalation path so you never miss a critical lead.",
        icon: "Phone",
      },
    ],
    roi: {
      missedCallsPerWeek: 6,
      avgValueLabel: "case value",
      avgValueNumber: 4500,
      recoveredPerMonth: 27000,
      paybackDays: 1,
    },
    ctaHeadline: "Start your free Legal AI agent in 5 minutes",
  },
  "real-estate": {
    slug: "real-estate",
    name: "Real Estate",
    customerType: "buyer or seller",
    heroIcon: "Home",
    problemStats: [
      {
        value: "78%",
        description: "of buyers work with the first agent who responds",
        icon: "Clock",
      },
      {
        value: "$8,500",
        description: "Average commission",
        icon: "DollarSign",
      },
      {
        value: "33%",
        description: "of inquiry calls missed by agents",
        icon: "PhoneMissed",
      },
    ],
    howItWorks: [
      {
        title: "Connect",
        description: "Use your existing number or a dedicated line for listings and buyer leads. Every call is answered in your name.",
      },
      {
        title: "Teach",
        description: "Add your listings, areas, and availability. Your agent qualifies leads and books showings the way you work.",
      },
      {
        title: "Relax",
        description: "Showings scheduled, buyers qualified, and sellers contacted without playing phone tag. You close more deals.",
      },
    ],
    capabilities: [
      {
        title: "Showing scheduling",
        description: "Book property showings and open house follow-ups in one call. Sync with your calendar.",
        icon: "Calendar",
      },
      {
        title: "Property info lookup",
        description: "Answer basic listing and area questions so leads get instant info and you get qualified callbacks.",
        icon: "Home",
      },
      {
        title: "Lead qualification",
        description: "Capture budget, timeline, and needs so you know who to prioritize and how to follow up.",
        icon: "Target",
      },
      {
        title: "Multi-agent routing",
        description: "Route calls to the right team member by area, listing, or language so no lead falls through.",
        icon: "Users",
      },
    ],
    roi: {
      missedCallsPerWeek: 10,
      avgValueLabel: "commission",
      avgValueNumber: 8500,
      recoveredPerMonth: 85000,
      paybackDays: 1,
    },
    ctaHeadline: "Start your free Real Estate AI agent in 5 minutes",
  },
  healthcare: {
    slug: "healthcare",
    name: "Healthcare",
    customerType: "patient",
    heroIcon: "Heart",
    problemStats: [
      {
        value: "30%",
        description: "of patients won't leave a voicemail",
        icon: "PhoneOff",
      },
      {
        value: "$12,000",
        description: "Average patient lifetime value",
        icon: "DollarSign",
      },
      {
        value: "45 min/day",
        description: "Staff time spent on phone scheduling",
        icon: "Clock",
      },
    ],
    howItWorks: [
      {
        title: "Connect",
        description: "Connect your practice number. Patient calls are answered 24/7 with HIPAA-compliant handling when you enable it.",
      },
      {
        title: "Teach",
        description: "Set services, hours, and protocols. Your agent books appointments, routes refills, and verifies insurance the way you want.",
      },
      {
        title: "Relax",
        description: "Front desk gets relief. Fewer no-shows with reminders. Every call documented for compliance and follow-up.",
      },
    ],
    capabilities: [
      {
        title: "HIPAA-compliant calls",
        description: "Optional BAA and secure handling so patient communications meet your compliance requirements.",
        icon: "Shield",
      },
      {
        title: "Appointment scheduling",
        description: "Book and reschedule appointments, confirm insurance, and collect intake details in one conversation.",
        icon: "Calendar",
      },
      {
        title: "Prescription refill routing",
        description: "Route refill requests and pharmacy calls to the right workflow so patients get answers faster.",
        icon: "Package",
      },
      {
        title: "Insurance verification",
        description: "Capture insurance info and relay to your team so verification happens before the visit.",
        icon: "CreditCard",
      },
    ],
    roi: {
      missedCallsPerWeek: 15,
      avgValueLabel: "avg visit",
      avgValueNumber: 200,
      recoveredPerMonth: 3000,
      paybackDays: 5,
    },
    ctaHeadline: "Start your free Healthcare AI agent in 5 minutes",
  },
};

export function getIndustryBySlug(slug: string): IndustryData | null {
  if (INDUSTRY_SLUGS.includes(slug as IndustrySlug)) {
    return INDUSTRIES_DATA[slug as IndustrySlug];
  }
  return null;
}

export function getAllIndustries(): IndustryData[] {
  return INDUSTRY_SLUGS.map((s) => INDUSTRIES_DATA[s]);
}
