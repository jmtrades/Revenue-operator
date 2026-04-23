/**
 * 20+ agent templates by communication style (not industry).
 * Used in onboarding Step 2 and dashboard agent creation.
 */

import type { Persona } from "@/lib/workspace/personalization";

export type AgentTemplateCategory =
  | "inbound"
  | "outbound"
  | "multi-channel"
  | "specialized";

/** Capabilities passed to Vapi (e.g. book_appointments for tool calls). */
export type TemplateCapability =
  | "answer_calls"
  | "take_messages"
  | "route_calls"
  | "book_appointments"
  | "follow_up"
  | "qualify_leads"
  | "capture_leads"
  | "transfer_calls"
  | "outbound_calls"
  | "book_zoom"
  | "collect_payments"
  | "check_orders"
  | "create_estimates"
  | "send_emails";

export interface AgentTemplate {
  id: string;
  name: string;
  category: AgentTemplateCategory;
  styleLabel: string;
  description: string;
  behaviors: [string, string, string];
  bestFor: string;
  defaultGreeting: string;
  /** Suggested ElevenLabs voice id for this template (curated voices). */
  voiceId?: string;
  /** Capabilities for Vapi tools: capture_lead, book_appointment, send_sms, etc. */
  capabilities?: TemplateCapability[];
  /**
   * Personas for whom this template is "recommended". Empty/undefined = shown to everyone.
   * If not set, use `getTemplatePersonas(template)` to derive defaults from category/id.
   */
  personas?: readonly Persona[];
}

export const AGENT_TEMPLATE_CATEGORIES: { id: AgentTemplateCategory; label: string }[] = [
  { id: "inbound", label: "Inbound" },
  { id: "outbound", label: "Outbound" },
  { id: "multi-channel", label: "Multi-channel" },
  { id: "specialized", label: "Specialized" },
];

export const AGENT_TEMPLATES: AgentTemplate[] = [
  // Inbound Specialists
  {
    id: "professional",
    name: "The Professional",
    category: "inbound",
    styleLabel: "Inbound · Formal · Corporate",
    description: "Formal, polished, corporate tone. Ideal for law, finance, and enterprise.",
    behaviors: ["Greets with clear identification", "Keeps language precise and professional", "Escalates with context"],
    bestFor: "Offices that need a polished first impression",
    defaultGreeting: "Hello, thanks for calling. How may I help you today?",
    voiceId: "us-female-professional",
    capabilities: ["answer_calls", "take_messages", "route_calls"],
  },
  {
    id: "friendly_helper",
    name: "The Friendly Helper",
    category: "inbound",
    styleLabel: "Inbound · Warm · Conversational",
    description: "Warm, conversational, empathetic. Puts callers at ease.",
    behaviors: ["Uses a warm, welcoming tone", "Asks clarifying questions gently", "Confirms next steps clearly"],
    bestFor: "Service businesses and care-focused teams",
    defaultGreeting: "Hi there! Thanks for calling. What can I help you with today?",
    capabilities: ["answer_calls", "take_messages", "book_appointments", "capture_leads"],
  },
  {
    id: "efficient_operator",
    name: "The Efficient Operator",
    category: "inbound",
    styleLabel: "Inbound · Direct · Fast",
    description: "Fast, direct, no-nonsense. Gets to the point quickly.",
    behaviors: ["Keeps calls short and goal-oriented", "Captures key details without small talk", "Summarizes actions before ending"],
    bestFor: "High-volume lines and busy teams",
    defaultGreeting: "Thanks for calling. How can I help you?",
    capabilities: ["answer_calls", "take_messages", "route_calls", "capture_leads"],
  },
  {
    id: "warm_welcome",
    name: "The Warm Welcome",
    category: "inbound",
    styleLabel: "Inbound · Patient · Relationship-focused",
    description: "Patient, thorough, relationship-focused. Takes time to get it right.",
    behaviors: ["Walks callers through options step by step", "Repeats back important details", "Offers follow-up before closing"],
    bestFor: "Consulting and high-touch services",
    defaultGreeting: "Hi, thanks for reaching out. I’m here to help — what do you need today?",
    capabilities: ["answer_calls", "book_appointments", "capture_leads", "follow_up", "book_zoom"],
  },
  {
    id: "night_owl",
    name: "The Night Owl",
    category: "inbound",
    styleLabel: "Inbound · Calm · After-hours",
    description: "Calm, reassuring after-hours presence. Handles calls when the office is closed.",
    behaviors: ["Reassures that someone will follow up", "Takes detailed messages", "Flags urgency for next-day callback"],
    bestFor: "After-hours and overflow coverage",
    defaultGreeting: "You’ve reached us after hours. I’ll take your information and someone will get back to you.",
    capabilities: ["answer_calls", "take_messages", "capture_leads"],
  },
  // Outbound Specialists
  {
    id: "follow_up_pro",
    name: "The Follow-Up Pro",
    category: "outbound",
    styleLabel: "Outbound · Persistent · Respectful",
    description: "Persistent but respectful lead follow-up. Keeps leads warm without being pushy.",
    behaviors: ["Confirms interest and timing", "Leaves clear next steps", "Respects opt-out and callback preferences"],
    bestFor: "Sales and lead-nurture teams",
    defaultGreeting: "Hi, this is a quick follow-up from our team. Do you have a moment?",
    voiceId: "us-male-warm",
    capabilities: ["outbound_calls", "qualify_leads", "book_appointments"],
  },
  {
    id: "appointment_setter",
    name: "The Appointment Setter",
    category: "outbound",
    styleLabel: "Outbound · Booking-focused",
    description: "Focused on booking meetings. Offers slots and confirms fast.",
    behaviors: ["Offers specific dates and times", "Confirms calendar and sends reminder", "Reschedules with minimal friction"],
    bestFor: "Consultations, demos, and scheduled services",
    defaultGreeting: "Hi, I’m calling to help schedule a time that works for you. What does your week look like?",
    capabilities: ["outbound_calls", "book_appointments", "book_zoom", "follow_up"],
  },
  {
    id: "reactivation_agent",
    name: "The Reactivation Agent",
    category: "outbound",
    styleLabel: "Outbound · Re-engagement",
    description: "Re-engages dormant contacts. Reopens conversations with context.",
    behaviors: ["References past interaction or purchase", "Offers a simple reason to reconnect", "Books or qualifies before ending"],
    bestFor: "Win-back and retention outreach",
    defaultGreeting: "Hi, we wanted to check in — it’s been a while. Is there anything we can help with now?",
    capabilities: ["outbound_calls", "qualify_leads", "book_appointments", "follow_up"],
  },
  {
    id: "survey_caller",
    name: "The Survey Caller",
    category: "outbound",
    styleLabel: "Outbound · Feedback · NPS",
    description: "Collects feedback, NPS, and reviews. Short and structured.",
    behaviors: ["Keeps surveys short and clear", "Captures scores and comments", "Thanks and closes without pitching"],
    bestFor: "Customer success and feedback programs",
    defaultGreeting: "Hi, this is a quick follow-up about your recent experience. Do you have one minute for a couple of questions?",
    capabilities: ["outbound_calls", "capture_leads", "follow_up"],
  },
  {
    id: "campaign_runner",
    name: "The Campaign Runner",
    category: "outbound",
    styleLabel: "Outbound · High-volume · Qualification",
    description: "High-volume outbound with qualification. Moves through lists efficiently.",
    behaviors: ["Confirms identity and interest quickly", "Qualifies and routes by outcome", "Logs result and next step"],
    bestFor: "Large lead lists and demand gen",
    defaultGreeting: "Hi, I’m calling from our team about your recent inquiry. Is now still a good time?",
    capabilities: ["outbound_calls", "qualify_leads", "capture_leads", "transfer_calls", "follow_up"],
  },
  // Multi-Channel
  {
    id: "inbox_manager",
    name: "The Inbox Manager",
    category: "multi-channel",
    styleLabel: "Multi-channel · Calls + texts",
    description: "Handles calls and texts seamlessly. One voice across channels.",
    behaviors: ["Uses the same tone on phone and text", "Summarizes call outcomes for follow-up text", "Keeps thread context across channels"],
    bestFor: "Teams that live in one inbox",
    defaultGreeting: "Hi, thanks for reaching out. How can I help you today?",
    capabilities: ["answer_calls", "take_messages", "follow_up", "send_emails"],
  },
  {
    id: "scheduling_coordinator",
    name: "The Scheduling Coordinator",
    category: "multi-channel",
    styleLabel: "Multi-channel · Calendar-first",
    description: "Calendar-first across channels. Books and reschedules via call or text.",
    behaviors: ["Checks real-time availability", "Sends confirmations and reminders", "Handles reschedule and cancel in one flow"],
    bestFor: "Appointment-driven businesses",
    defaultGreeting: "Hi! I can help you find a time that works. What day or time do you prefer?",
    capabilities: ["answer_calls", "book_appointments", "book_zoom", "follow_up"],
  },
  {
    id: "lead_qualifier",
    name: "The Lead Qualifier",
    category: "multi-channel",
    styleLabel: "Multi-channel · Qualify · Route",
    description: "Asks questions, scores, and routes. Surfaces the best leads first.",
    behaviors: ["Asks a few key qualification questions", "Scores and tags for your CRM", "Routes hot leads to the right person"],
    bestFor: "Sales and intake teams",
    defaultGreeting: "Thanks for getting in touch. I’ll ask a few quick questions so we can get you to the right next step.",
    capabilities: ["answer_calls", "qualify_leads", "capture_leads", "transfer_calls", "create_estimates"],
  },
  {
    id: "support_agent",
    name: "The Support Agent",
    category: "multi-channel",
    styleLabel: "Multi-channel · Questions · Escalate",
    description: "Handles questions, troubleshoots, and escalates when needed.",
    behaviors: ["Answers common questions from knowledge", "Walks through simple fixes", "Escalates complex issues with context"],
    bestFor: "Customer support and help desks",
    defaultGreeting: "Hi, how can I help you today? I can answer questions or get you to the right person.",
    voiceId: "us-female-empathetic",
    capabilities: ["answer_calls", "take_messages", "transfer_calls"],
  },
  {
    id: "bilingual_agent",
    name: "The Bilingual Agent",
    category: "multi-channel",
    styleLabel: "Multi-channel · English + Spanish",
    description: "English and Spanish. Switches language based on caller preference.",
    behaviors: ["Detects language and responds in kind", "Keeps the same tone in both languages", "Offers language choice at the start"],
    bestFor: "Communities that speak multiple languages",
    defaultGreeting: "Thanks for calling. For English, press 1. Para español, marque 2.",
    capabilities: ["answer_calls", "take_messages", "book_appointments", "capture_leads", "transfer_calls"],
  },
  // Specialized
  {
    id: "screener",
    name: "The Screener",
    category: "specialized",
    styleLabel: "Specialized · Messages · Filter",
    description: "Takes messages, filters spam, and forwards important calls.",
    behaviors: ["Takes clear, structured messages", "Filters obvious spam and sales", "Flags urgent callers for immediate callback"],
    bestFor: "Executives and busy decision-makers",
    defaultGreeting: "Hi, I’m taking calls for the team. May I get your name and what this is regarding?",
    capabilities: ["answer_calls", "take_messages", "route_calls", "transfer_calls"],
  },
  {
    id: "emergency_router",
    name: "The Emergency Router",
    category: "specialized",
    styleLabel: "Specialized · Urgency · Dispatch",
    description: "Triages urgency and dispatches emergencies. Keeps everyone safe.",
    behaviors: ["Identifies urgency from keywords and tone", "Dispatches per your rules", "Stays calm and gives clear next steps"],
    bestFor: "On-call and emergency lines",
    defaultGreeting: "You’ve reached the line. If this is an emergency, say so and I’ll get the right person alerted right away.",
    capabilities: ["answer_calls", "transfer_calls", "route_calls", "take_messages", "capture_leads"],
  },
  {
    id: "concierge",
    name: "The Concierge",
    category: "specialized",
    styleLabel: "Specialized · Premium · High-touch",
    description: "Premium, high-touch VIP experience. Every caller feels like a priority.",
    behaviors: ["Uses names and references past interactions", "Offers options before asking", "Confirms preferences and follows up"],
    bestFor: "Premium and VIP clients",
    defaultGreeting: "Hello, thank you for calling. How may I assist you today?",
    capabilities: ["answer_calls", "book_appointments", "book_zoom", "transfer_calls", "follow_up", "send_emails"],
  },
  {
    id: "price_quoter",
    name: "The Price Quoter",
    category: "specialized",
    styleLabel: "Specialized · Pricing · Estimates",
    description: "Handles pricing and generates estimates. Reduces back-and-forth.",
    behaviors: ["Answers pricing from your knowledge", "Gathers details for accurate quotes", "Sends quote or next step by text or email"],
    bestFor: "Service businesses with clear pricing",
    defaultGreeting: "Hi, thanks for calling. I can walk you through pricing and options. What are you looking for?",
    capabilities: ["answer_calls", "create_estimates", "capture_leads", "follow_up", "collect_payments"],
  },
  {
    id: "review_collector",
    name: "The Review Collector",
    category: "specialized",
    styleLabel: "Specialized · Post-service · Reviews",
    description: "Post-service follow-up for reviews. Short, friendly, and optional.",
    behaviors: ["Calls after completed service", "Asks for a quick rating or review", "Thanks and closes without pressure"],
    bestFor: "Local businesses that rely on reviews",
    defaultGreeting: "Hi, this is a quick follow-up about your recent visit. Would you be willing to share how it went?",
    capabilities: ["outbound_calls", "capture_leads", "follow_up"],
  },
  // ──────────────── Additional Templates ────────────────
  {
    id: "payment_collector",
    name: "The Payment Collector",
    category: "specialized",
    styleLabel: "Specialized · Payments · Balances",
    description: "Handles payment collection, balance inquiries, and deposit requests professionally.",
    behaviors: ["Verifies identity before discussing balances", "Sends secure payment links by text", "Confirms payment and sends receipt"],
    bestFor: "Businesses that collect payments or deposits",
    defaultGreeting: "Hi, I'm calling about your account. Do you have a moment?",
    capabilities: ["outbound_calls", "collect_payments", "follow_up", "check_orders"],
  },
  {
    id: "zoom_scheduler",
    name: "The Virtual Meeting Scheduler",
    category: "multi-channel",
    styleLabel: "Multi-channel · Zoom · Video",
    description: "Schedules Zoom and video meetings. Perfect for remote-first businesses.",
    behaviors: ["Offers virtual meeting as default", "Sends Zoom link by email immediately", "Confirms timezone and availability"],
    bestFor: "Remote teams, consultants, and coaches",
    defaultGreeting: "Hi! I can help schedule a video meeting. What works best for you?",
    capabilities: ["answer_calls", "book_zoom", "book_appointments", "follow_up", "send_emails"],
  },
  {
    id: "estimate_builder",
    name: "The Estimate Builder",
    category: "specialized",
    styleLabel: "Specialized · Quotes · Estimates",
    description: "Gathers project details and generates estimates. Reduces back-and-forth.",
    behaviors: ["Asks structured questions about the project", "Provides ranges when possible", "Sends formal estimate by email"],
    bestFor: "Contractors, trades, and service businesses",
    defaultGreeting: "Thanks for calling. I can help put together an estimate for you. What project do you have in mind?",
    capabilities: ["answer_calls", "create_estimates", "capture_leads", "follow_up", "send_emails"],
  },
  {
    id: "order_tracker",
    name: "The Order Tracker",
    category: "specialized",
    styleLabel: "Specialized · Orders · Status",
    description: "Handles order status inquiries, tracking updates, and delivery questions.",
    behaviors: ["Looks up orders by number or phone", "Gives clear delivery timeline", "Escalates issues with full context"],
    bestFor: "E-commerce, delivery, and fulfillment businesses",
    defaultGreeting: "Hi, thanks for calling. Do you have an order number I can look up for you?",
    capabilities: ["answer_calls", "check_orders", "transfer_calls", "take_messages"],
  },
  {
    id: "insurance_intake",
    name: "The Insurance Intake Agent",
    category: "specialized",
    styleLabel: "Specialized · Insurance · Compliance",
    description: "Handles insurance inquiries with required disclosures. Captures policy details accurately.",
    behaviors: ["Reads required disclosures naturally", "Captures policy type and coverage needs", "Routes complex claims to humans"],
    bestFor: "Insurance agencies and brokers",
    defaultGreeting: "Thanks for calling. Are you looking for a quote, have a claim, or need to review your policy?",
    capabilities: ["answer_calls", "capture_leads", "create_estimates", "transfer_calls", "follow_up"],
  },
  {
    id: "healthcare_intake",
    name: "The Medical Office Agent",
    category: "specialized",
    styleLabel: "Specialized · Healthcare · Scheduling",
    description: "Handles medical office calls — scheduling, prescription refills, and triage questions.",
    behaviors: ["Asks for patient details and insurance", "Triages urgency for same-day requests", "Protects patient privacy"],
    bestFor: "Medical offices, clinics, and healthcare practices",
    defaultGreeting: "Thanks for calling. Are you scheduling an appointment, need a refill, or have a question?",
    capabilities: ["answer_calls", "book_appointments", "take_messages", "transfer_calls", "capture_leads"],
  },
  {
    id: "real_estate_agent",
    name: "The Listing Agent",
    category: "specialized",
    styleLabel: "Specialized · Real Estate · Showings",
    description: "Handles property inquiries, schedules showings, and qualifies buyers.",
    behaviors: ["Answers listing questions from knowledge", "Qualifies buyer intent and timeline", "Books showings with confirmation"],
    bestFor: "Real estate agents and brokerages",
    defaultGreeting: "Thanks for calling about the property. What questions can I answer for you?",
    capabilities: ["answer_calls", "book_appointments", "qualify_leads", "capture_leads", "follow_up", "send_emails"],
  },
  {
    id: "debt_friendly",
    name: "The Accounts Advisor",
    category: "outbound",
    styleLabel: "Outbound · Accounts · Friendly collections",
    description: "Friendly account balance follow-up. Helps customers resolve outstanding balances without pressure.",
    behaviors: ["Uses empathetic language about overdue balances", "Offers payment plans and options", "Sends secure payment links"],
    bestFor: "Billing departments and accounts receivable",
    defaultGreeting: "Hi, this is a courtesy call about your account. Do you have a moment?",
    capabilities: ["outbound_calls", "collect_payments", "follow_up", "send_emails"],
  },
  {
    id: "onboarding_guide",
    name: "The Onboarding Guide",
    category: "outbound",
    styleLabel: "Outbound · Welcome · Setup",
    description: "Welcome calls for new customers. Walks through setup, answers questions, ensures satisfaction.",
    behaviors: ["Welcomes warmly and confirms sign-up details", "Walks through first steps", "Schedules follow-up if needed"],
    bestFor: "SaaS, subscription, and service companies",
    defaultGreeting: "Hi! I'm calling to welcome you and help you get started. Do you have a few minutes?",
    capabilities: ["outbound_calls", "book_zoom", "follow_up", "send_emails"],
  },
  {
    id: "satisfaction_checker",
    name: "The Satisfaction Agent",
    category: "outbound",
    styleLabel: "Outbound · CSAT · Retention",
    description: "Post-service satisfaction check. Catches issues early, prevents churn, and collects testimonials.",
    behaviors: ["Asks about experience without being pushy", "Escalates complaints immediately", "Asks for referrals when satisfied"],
    bestFor: "Service businesses focused on retention",
    defaultGreeting: "Hi, just checking in after your recent service. How did everything go?",
    capabilities: ["outbound_calls", "capture_leads", "transfer_calls", "follow_up"],
  },
  // ── Industry-Specific Specialists ────────────────────────────
  {
    id: "plumbing_dispatcher",
    name: "The Plumbing Dispatcher",
    category: "inbound",
    styleLabel: "Inbound · Plumbing · Urgent",
    description: "Handles plumbing emergencies and service requests. Triages urgency, books service windows, captures job details.",
    behaviors: ["Assesses urgency (leak vs planned work)", "Books service windows with address capture", "Escalates emergencies to on-call tech"],
    bestFor: "Plumbing companies and home service providers",
    defaultGreeting: "Thanks for calling! Are you dealing with an emergency or scheduling a service?",
    capabilities: ["answer_calls", "book_appointments", "capture_leads", "transfer_calls", "create_estimates"],
  },
  {
    id: "ecommerce_support",
    name: "The E-Commerce Agent",
    category: "inbound",
    styleLabel: "Inbound · E-Commerce · Orders",
    description: "Handles order inquiries, returns, tracking, and product questions for online stores.",
    behaviors: ["Looks up orders by number or email", "Processes return and exchange requests", "Answers product questions from knowledge base"],
    bestFor: "Online stores and DTC brands",
    defaultGreeting: "Thanks for calling! Do you have an order question or are you looking for something new?",
    capabilities: ["answer_calls", "check_orders", "capture_leads", "send_emails", "transfer_calls"],
  },
  {
    id: "property_manager",
    name: "The Property Manager",
    category: "inbound",
    styleLabel: "Inbound · Property · Tenants",
    description: "Handles tenant inquiries, maintenance requests, and rental availability. Professional and efficient.",
    behaviors: ["Fields maintenance requests with priority triage", "Answers availability and lease questions", "Routes emergencies to property manager"],
    bestFor: "Property management companies and landlords",
    defaultGreeting: "Thank you for calling. Are you a current tenant or inquiring about a property?",
    capabilities: ["answer_calls", "take_messages", "capture_leads", "transfer_calls", "book_appointments"],
  },
  {
    id: "salon_concierge",
    name: "The Salon Concierge",
    category: "inbound",
    styleLabel: "Inbound · Salon · Beauty",
    description: "Books salon appointments, answers service questions, and handles cancellations with warmth.",
    behaviors: ["Recommends services based on client needs", "Books with specific stylist preferences", "Handles same-day availability checks"],
    bestFor: "Hair salons, spas, nail salons, and beauty studios",
    defaultGreeting: "Hi, thanks for calling! Are you looking to book an appointment?",
    capabilities: ["answer_calls", "book_appointments", "capture_leads", "follow_up", "send_emails"],
  },
  {
    id: "education_enrollment",
    name: "The Enrollment Advisor",
    category: "inbound",
    styleLabel: "Inbound · Education · Enrollment",
    description: "Handles enrollment inquiries, program info, scheduling campus tours, and financial aid questions.",
    behaviors: ["Explains programs and prerequisites clearly", "Schedules campus tours and orientations", "Routes financial aid questions appropriately"],
    bestFor: "Schools, tutoring centers, universities, and training programs",
    defaultGreeting: "Thank you for calling! Are you interested in learning about our programs?",
    capabilities: ["answer_calls", "book_appointments", "capture_leads", "send_emails", "transfer_calls"],
  },
  {
    id: "pet_care_receptionist",
    name: "The Pet Care Receptionist",
    category: "inbound",
    styleLabel: "Inbound · Pets · Veterinary",
    description: "Handles pet appointments, grooming bookings, and pet emergency triage with a warm, caring tone.",
    behaviors: ["Triages pet emergencies from routine visits", "Books grooming and vet appointments", "Captures pet breed, age, and vaccination status"],
    bestFor: "Vet clinics, pet groomers, and animal hospitals",
    defaultGreeting: "Hi there! How can I help you and your furry friend today?",
    capabilities: ["answer_calls", "book_appointments", "capture_leads", "transfer_calls", "take_messages"],
  },
  {
    id: "financial_intake",
    name: "The Financial Intake Agent",
    category: "inbound",
    styleLabel: "Inbound · Finance · Intake",
    description: "Handles financial service inquiries with compliance awareness. Captures client needs without giving advice.",
    behaviors: ["Captures financial service needs and timeline", "Schedules consultations with advisors", "Maintains compliance boundaries at all times"],
    bestFor: "CPA firms, financial advisors, and wealth managers",
    defaultGreeting: "Thank you for calling. How can we help with your financial needs today?",
    capabilities: ["answer_calls", "book_appointments", "capture_leads", "send_emails", "transfer_calls"],
  },
  {
    id: "cleaning_booker",
    name: "The Cleaning Booker",
    category: "inbound",
    styleLabel: "Inbound · Cleaning · Booking",
    description: "Books cleaning appointments, provides quotes based on home size, and manages recurring schedules.",
    behaviors: ["Captures home size, rooms, and special requests", "Quotes based on service type and size", "Sets up recurring cleaning schedules"],
    bestFor: "Residential and commercial cleaning companies",
    defaultGreeting: "Hi, thanks for calling! Looking for a one-time clean or a recurring schedule?",
    capabilities: ["answer_calls", "book_appointments", "capture_leads", "create_estimates", "follow_up"],
  },
  {
    id: "travel_advisor",
    name: "The Travel Advisor",
    category: "inbound",
    styleLabel: "Inbound · Travel · Bookings",
    description: "Handles travel inquiries, captures trip preferences, and schedules planning consultations.",
    behaviors: ["Captures destination, dates, budget, and party size", "Suggests package types based on preferences", "Books planning consultations with agents"],
    bestFor: "Travel agencies and tour operators",
    defaultGreeting: "Welcome! Where are you dreaming of traveling to?",
    capabilities: ["answer_calls", "book_appointments", "capture_leads", "send_emails", "book_zoom"],
  },
  {
    id: "recruiter_screener",
    name: "The Recruiter Screener",
    category: "multi-channel",
    styleLabel: "Multi-channel · Recruiting · Screening",
    description: "Pre-screens candidates, schedules interviews, and captures qualification details for recruiters.",
    behaviors: ["Asks structured screening questions", "Schedules interviews with calendar checks", "Rates candidate fit and passes notes to recruiter"],
    bestFor: "Staffing agencies, HR departments, and recruiters",
    defaultGreeting: "Hi, thanks for your interest in the position! I have a few quick questions to get started.",
    capabilities: ["answer_calls", "book_appointments", "capture_leads", "book_zoom", "send_emails", "qualify_leads"],
  },
];

export function getAgentTemplateById(id: string): AgentTemplate | undefined {
  return AGENT_TEMPLATES.find((t) => t.id === id);
}

export function getAgentTemplatesByCategory(
  category: AgentTemplateCategory | "all"
): AgentTemplate[] {
  if (category === "all") return AGENT_TEMPLATES;
  return AGENT_TEMPLATES.filter((t) => t.category === category);
}

/** Returns capabilities for Vapi tool calls (e.g. book_appointments) from template id. */
export function getTemplateCapabilities(templateId: string | null | undefined): string[] {
  if (!templateId) return [];
  const t = getAgentTemplateById(templateId);
  if (t?.capabilities?.length) return [...t.capabilities];
  const id = templateId.toLowerCase();
  if (id.includes("appointment") || id.includes("scheduling") || id.includes("zoom")) return ["answer_calls", "book_appointments", "book_zoom", "follow_up"];
  if (id.includes("lead") || id.includes("qualif")) return ["answer_calls", "qualify_leads", "capture_leads", "transfer_calls", "create_estimates"];
  if (id.includes("night") || id.includes("after")) return ["answer_calls", "take_messages", "capture_leads", "book_appointments"];
  if (id.includes("support") || id.includes("order")) return ["answer_calls", "take_messages", "transfer_calls", "check_orders"];
  if (id.includes("follow_up") || id.includes("followup") || id.includes("reactivat")) return ["outbound_calls", "qualify_leads", "book_appointments", "follow_up"];
  if (id.includes("payment") || id.includes("collect") || id.includes("billing")) return ["outbound_calls", "collect_payments", "follow_up"];
  if (id.includes("estimat") || id.includes("quot")) return ["answer_calls", "create_estimates", "capture_leads", "follow_up"];
  if (id.includes("concierge") || id.includes("premium") || id.includes("vip")) return ["answer_calls", "book_appointments", "book_zoom", "transfer_calls", "follow_up", "send_emails"];
  return [];
}

/** Returns suggested ElevenLabs voice id for template, if set. */
export function getTemplateVoiceId(templateId: string | null | undefined): string | undefined {
  if (!templateId) return undefined;
  return getAgentTemplateById(templateId)?.voiceId;
}

/**
 * Returns which personas this template is recommended for.
 *
 * Precedence:
 *   1. Explicit `template.personas` if set
 *   2. Heuristic based on category + id keywords
 *   3. Empty array (= shown to everyone) as a safe default
 */
export function getTemplatePersonas(template: AgentTemplate): readonly Persona[] {
  if (template.personas && template.personas.length > 0) return template.personas;

  const id = template.id.toLowerCase();
  const cat = template.category;

  // Outbound / pipeline work → SDR + sales manager first, plus solo/agency.
  if (cat === "outbound") {
    if (id.includes("payment") || id.includes("debt") || id.includes("collect")) {
      return ["office_manager", "owner", "agency_operator"] as const;
    }
    if (id.includes("survey") || id.includes("satisfaction") || id.includes("review")) {
      return ["sales_manager", "owner", "office_manager", "agency_operator"] as const;
    }
    return ["sdr", "sales_manager", "solo_operator", "agency_operator"] as const;
  }

  // Specialized templates vary widely — inspect id for intent.
  if (cat === "specialized") {
    if (
      id.includes("emergency") ||
      id.includes("dispatcher") ||
      id.includes("screener") ||
      id.includes("concierge")
    ) {
      return ["office_manager", "owner", "solo_operator", "agency_operator"] as const;
    }
    if (id.includes("estimate") || id.includes("quot") || id.includes("price") || id.includes("payment")) {
      return ["owner", "solo_operator", "office_manager", "agency_operator"] as const;
    }
    if (id.includes("healthcare") || id.includes("medical") || id.includes("real_estate") || id.includes("insurance")) {
      return ["office_manager", "solo_operator", "owner"] as const;
    }
    // Default specialized → owner + office manager.
    return ["owner", "office_manager", "solo_operator", "agency_operator"] as const;
  }

  // Multi-channel = versatile; pitch to owners, office managers, and solos.
  if (cat === "multi-channel") {
    if (id.includes("lead") || id.includes("qualif")) {
      return ["sdr", "sales_manager", "owner", "agency_operator"] as const;
    }
    if (id.includes("recruit")) {
      return ["sales_manager", "owner", "agency_operator"] as const;
    }
    return ["owner", "office_manager", "solo_operator", "agency_operator"] as const;
  }

  // Inbound = front-desk / office coverage by default.
  if (cat === "inbound") {
    if (id.includes("night") || id.includes("after")) {
      return ["office_manager", "owner", "solo_operator"] as const;
    }
    return ["office_manager", "owner", "solo_operator", "agency_operator"] as const;
  }

  return [];
}

/**
 * Filter + sort templates so persona-recommended ones come first.
 *
 * Unlike `filterTemplatesForPersona` (which works off the `personas` field),
 * this version uses the heuristic in `getTemplatePersonas`.
 */
export function sortTemplatesForPersona(
  templates: readonly AgentTemplate[],
  persona: Persona | null | undefined,
): AgentTemplate[] {
  if (!persona) return [...templates];
  const matches: AgentTemplate[] = [];
  const rest: AgentTemplate[] = [];
  for (const t of templates) {
    const p = getTemplatePersonas(t);
    if (p.length === 0 || p.includes(persona)) {
      matches.push(t);
    } else {
      rest.push(t);
    }
  }
  return [...matches, ...rest];
}
