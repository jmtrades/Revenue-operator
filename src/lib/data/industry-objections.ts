/**
 * Industry-Specific Objection Libraries
 * Pre-built objection handling for common industry verticals.
 * Auto-loaded into agent config when a workspace selects an industry.
 */

export interface IndustryObjection {
  trigger: string;
  response: string;
  category: "pricing" | "trust" | "timing" | "competition" | "authority" | "need" | "general";
}

export interface IndustryConfig {
  industry: string;
  display_name: string;
  description: string;
  objections: IndustryObjection[];
  qualification_questions: string[];
  suggested_greeting: string;
  key_services: string[];
  compliance_notes?: string;
}

export const INDUSTRY_CONFIGS: Record<string, IndustryConfig> = {
  home_services: {
    industry: "home_services",
    display_name: "Home Services",
    description: "HVAC, plumbing, electrical, roofing, general contracting",
    suggested_greeting: "Hi, thanks for calling! We're here to help with any home service needs. What can we do for you today?",
    key_services: ["HVAC repair", "Plumbing", "Electrical", "Roofing", "General maintenance", "Emergency repairs"],
    qualification_questions: [
      "Is this for a residential or commercial property?",
      "How urgent is this — is it an emergency or can it wait a few days?",
      "Have you had this issue looked at before?",
      "What's the best time for someone to come take a look?",
    ],
    objections: [
      { trigger: "too expensive", response: "I understand price is important. We offer free estimates so you can see exactly what's involved before committing. Plus, we often find solutions that fit different budgets. Can I schedule a no-obligation estimate?", category: "pricing" },
      { trigger: "I'll get other quotes", response: "Absolutely, that's smart! We encourage comparing. What I can tell you is our estimates are always free, and we're usually very competitive. Want me to get one on the books so you can compare?", category: "pricing" },
      { trigger: "I can do it myself", response: "I respect that! Some jobs are definitely DIY-friendly. Just so you know, for things involving gas lines, electrical panels, or structural work, having a licensed pro can save you from bigger issues down the road. Would you like a quick consultation to assess what's involved?", category: "need" },
      { trigger: "I need to ask my spouse", response: "Of course! Would it help if I sent over a summary of what we discussed so you can both look at it together? I can also schedule a time when you're both available.", category: "authority" },
      { trigger: "bad experience before", response: "I'm sorry to hear that. We take pride in our work and all our jobs come with a satisfaction guarantee. I'd love the chance to show you the difference. Can I set up a free consultation?", category: "trust" },
      { trigger: "not an emergency", response: "That's good to hear! Even though it's not urgent, addressing it now can prevent bigger problems later. We have flexible scheduling — what day works best for you?", category: "timing" },
      { trigger: "just looking for pricing", response: "I understand! Every job is a bit different, so our pricing is based on a free on-site assessment. This way you get an accurate quote, not a guess. Can I schedule that for you?", category: "pricing" },
    ],
  },

  healthcare: {
    industry: "healthcare",
    display_name: "Healthcare & Medical",
    description: "Medical offices, dental practices, chiropractic, therapy, wellness clinics",
    suggested_greeting: "Thank you for calling our office. We're happy to help you. How can we assist you today?",
    key_services: ["Patient appointments", "Insurance verification", "Prescription refills", "Lab results", "Referrals", "New patient intake"],
    compliance_notes: "HIPAA applies. Never discuss specific medical information. Always verify caller identity before sharing any patient data.",
    qualification_questions: [
      "Are you a new patient or have you been seen here before?",
      "What type of appointment are you looking to schedule?",
      "Do you have insurance you'd like us to verify?",
      "Is there a particular provider you'd like to see?",
    ],
    objections: [
      { trigger: "do you take my insurance", response: "Great question! We work with many insurance providers. Can I get your insurance information and I'll verify your coverage right away? It only takes a moment.", category: "pricing" },
      { trigger: "too long to wait", response: "I understand waiting can be frustrating. Let me check our earliest availability. We also have a cancellation list — if something opens sooner, we'll call you right away. Sound good?", category: "timing" },
      { trigger: "just need a prescription refill", response: "I can help with that! Let me get your details and I'll have the provider review it. Usually refills are processed within 24 hours. Can I get your name and date of birth?", category: "need" },
      { trigger: "I'll just go to urgent care", response: "Urgent care is great for immediate needs. If this is something that can wait a day or two, seeing your regular provider means they have your full history and can give more personalized care. We have availability this week — would that work?", category: "competition" },
      { trigger: "is the doctor good", response: "Our providers are highly rated by their patients. I can share more about their credentials, or if you'd prefer, many patients leave reviews online. Would you like me to schedule a consultation so you can meet them?", category: "trust" },
    ],
  },

  legal: {
    industry: "legal",
    display_name: "Legal Services",
    description: "Law firms, attorneys, paralegals, legal consultations",
    suggested_greeting: "Thank you for calling our law office. How can we help you today?",
    key_services: ["Legal consultations", "Case evaluation", "Document preparation", "Court representation", "Legal advice"],
    compliance_notes: "Attorney-client privilege applies. Never give specific legal advice — always recommend a consultation.",
    qualification_questions: [
      "What type of legal matter is this regarding?",
      "Have you spoken with another attorney about this?",
      "Is there a deadline or court date we should be aware of?",
      "Would you like to schedule a consultation to discuss your options?",
    ],
    objections: [
      { trigger: "too expensive", response: "I understand legal fees are a concern. Many of our cases start with a free or low-cost consultation so you can understand your options before committing. We also offer payment plans for qualifying cases. Would you like to schedule a consultation?", category: "pricing" },
      { trigger: "I'll handle it myself", response: "I respect that. For your protection though, having an attorney review your situation — even just once — can make sure you don't miss anything important. Our initial consultations are designed for exactly that. Would a quick review be helpful?", category: "need" },
      { trigger: "how do I know you're good", response: "That's the right question to ask. Our attorneys have handled hundreds of cases like this. I'd recommend scheduling a consultation — you'll get a feel for how we work and whether we're the right fit. No obligation.", category: "trust" },
      { trigger: "I already have a lawyer", response: "That's great you have representation. If you're looking for a second opinion or if your needs have changed, we're happy to discuss your situation. Many clients come to us after wanting a fresh perspective.", category: "competition" },
      { trigger: "do you do free consultations", response: "Yes, we offer an initial consultation to discuss your situation and explain your options. This gives you the information you need to make the best decision. Shall I schedule one for you?", category: "pricing" },
    ],
  },

  real_estate: {
    industry: "real_estate",
    display_name: "Real Estate",
    description: "Real estate agents, property management, mortgage brokers",
    suggested_greeting: "Hi, thanks for calling! Whether you're buying, selling, or renting, we're here to help. What brings you in today?",
    key_services: ["Home buying", "Home selling", "Rentals", "Property management", "Market analysis", "Mortgage referrals"],
    qualification_questions: [
      "Are you looking to buy, sell, or rent?",
      "What area are you interested in?",
      "What's your ideal timeline for making a move?",
      "Have you been pre-approved for a mortgage, or would you like help with that?",
    ],
    objections: [
      { trigger: "just browsing", response: "No pressure at all! A lot of our best clients started with browsing. Can I send you listings that match what you're looking for? That way you can browse on your time and reach out when you're ready.", category: "timing" },
      { trigger: "the market is bad", response: "I hear that a lot, and it depends on what you're looking for. In every market there are opportunities. Let me show you what's actually happening in your target area — you might be surprised. Can we set up a quick call?", category: "general" },
      { trigger: "I have a realtor", response: "Great that you're already working with someone! If you ever want a second opinion on pricing or market conditions, we're always happy to chat. No strings attached.", category: "competition" },
      { trigger: "commission too high", response: "I understand that's a significant consideration. Our commission reflects the full service we provide — marketing, negotiation, paperwork, and our track record of getting top dollar for our clients. Would you like to see our marketing plan? Many sellers find the ROI far exceeds the cost.", category: "pricing" },
      { trigger: "I want to sell by owner", response: "I respect that decision. If you'd like a free market analysis to make sure your listing price is competitive, we're happy to provide one with no obligation. Having the right price from day one can make a huge difference.", category: "need" },
    ],
  },

  automotive: {
    industry: "automotive",
    display_name: "Automotive",
    description: "Auto repair shops, dealerships, body shops, detailing",
    suggested_greeting: "Thanks for calling! Whether you need service, repairs, or a new vehicle, we're here to help. What can we do for you?",
    key_services: ["Vehicle repair", "Maintenance", "Diagnostics", "Body work", "Detailing", "Sales"],
    qualification_questions: [
      "What year, make, and model is your vehicle?",
      "What seems to be the issue or what service do you need?",
      "How soon do you need this taken care of?",
      "Do you have a warranty or service plan we should know about?",
    ],
    objections: [
      { trigger: "too expensive", response: "I understand repairs can add up. Let me break down what's needed versus what's optional so you can prioritize. We also offer financing for larger repairs. Want me to go through the options?", category: "pricing" },
      { trigger: "I'll go to the dealership", response: "Dealerships do great work! We provide the same quality service, often at a lower cost, and with more flexible scheduling. Plus, using us doesn't void your warranty. Would you like to compare estimates?", category: "competition" },
      { trigger: "can I see it first", response: "Absolutely! We're completely transparent. You're welcome to come in, we'll put it on the lift and show you exactly what we're seeing. No charge for the look. When works for you?", category: "trust" },
      { trigger: "do you have a loaner", response: "We have a shuttle service and can also help arrange a rental at a discount. For larger jobs, we try our best to accommodate. What would work best for you?", category: "general" },
      { trigger: "just an oil change", response: "We'd love to take care of that for you! While you're here, we do a complimentary multi-point inspection so you know the overall health of your vehicle. No upsell pressure — just good info. When would you like to come in?", category: "need" },
    ],
  },

  insurance: {
    industry: "insurance",
    display_name: "Insurance",
    description: "Insurance agencies, health insurance, auto insurance, home insurance, life insurance",
    suggested_greeting: "Thanks for calling! We help make insurance simple and affordable. What can I help you with today?",
    key_services: ["Auto insurance", "Home insurance", "Life insurance", "Health insurance", "Business insurance", "Claims support"],
    qualification_questions: [
      "What type of insurance are you looking for?",
      "Do you currently have a policy in place?",
      "When does your current policy renew?",
      "What's most important to you — coverage, price, or both?",
    ],
    objections: [
      { trigger: "happy with current provider", response: "That's great! Many of our clients were happy too until they saw how much they could save. A quick quote takes just 5 minutes and there's no obligation. Worst case, you confirm you already have a great deal. Want to try?", category: "competition" },
      { trigger: "insurance is a scam", response: "I understand the skepticism. The truth is, insurance is really about protecting what matters most to you. We focus on getting you the right coverage without overpaying. Can I do a quick review to make sure you're not paying for things you don't need?", category: "trust" },
      { trigger: "just want a quote", response: "Absolutely! I can get you a quote in about 5 minutes. I just need a few details. Ready?", category: "general" },
      { trigger: "too many questions", response: "I totally get it — I'll keep it simple. I only need a few key details to get you an accurate quote. It'll be quick, I promise!", category: "general" },
      { trigger: "I don't need that much coverage", response: "Let's make sure you're covered for what matters and not paying for what doesn't. I can walk you through exactly what each part covers so you can decide. Sound fair?", category: "need" },
    ],
  },

  fitness: {
    industry: "fitness",
    display_name: "Fitness & Wellness",
    description: "Gyms, personal training, yoga studios, wellness centers, spas",
    suggested_greeting: "Hey there! Thanks for reaching out. Whether you're looking to get started or take your fitness to the next level, we're here for you. What's on your mind?",
    key_services: ["Gym memberships", "Personal training", "Group classes", "Yoga", "Massage", "Nutrition coaching"],
    qualification_questions: [
      "What are your main fitness goals?",
      "Have you worked with a trainer or gym before?",
      "What's your schedule like — mornings, evenings, weekends?",
      "Would you like to start with a free trial or consultation?",
    ],
    objections: [
      { trigger: "too expensive", response: "I hear you. Let me show you the value you're getting — when you break it down per visit, it's less than a coffee. Plus, we have flexible plans to fit any budget. Want me to walk you through the options?", category: "pricing" },
      { trigger: "I'll start next month", response: "I totally understand wanting to wait for the right time. Here's the thing though — the best time to start is always now, and we're running a special right now that might not be available next month. Want me to save your spot?", category: "timing" },
      { trigger: "I can work out at home", response: "Home workouts are great! The difference with us is accountability, equipment you can't get at home, and expert guidance. A lot of our members tried home workouts first and found they get way better results here. Want to try a free class?", category: "competition" },
      { trigger: "I'm not in shape", response: "That's exactly why we're here! Everyone starts somewhere, and our trainers specialize in helping beginners. No judgment, ever. Would you like to come in and see how welcoming it is?", category: "trust" },
      { trigger: "long contract", response: "We have month-to-month options with no long-term commitment. You can try us out risk-free. If you love it, great. If not, no hard feelings. Sound fair?", category: "general" },
    ],
  },

  saas: {
    industry: "saas",
    display_name: "SaaS & Technology",
    description: "Software companies, tech startups, B2B solutions, cloud services",
    suggested_greeting: "Hi! Thanks for your interest in our platform. I'd love to learn about what you're looking for and see how we can help. What brings you here today?",
    key_services: ["Product demos", "Free trials", "Enterprise plans", "Custom integrations", "Onboarding", "Technical support"],
    qualification_questions: [
      "What's the main challenge you're trying to solve?",
      "How many team members would be using the platform?",
      "What tools are you currently using for this?",
      "What's your timeline for making a decision?",
    ],
    objections: [
      { trigger: "too expensive", response: "I understand budget matters. Let me ask — what's the cost of NOT solving this problem? Many of our customers find the ROI pays for itself within the first month. Would a custom ROI analysis help?", category: "pricing" },
      { trigger: "we already use something", response: "Great that you have a solution! What we hear from companies that switch is usually around one or two pain points their current tool doesn't solve well. Is there anything like that for you? Even if you stay with your current tool, I might have some useful insights.", category: "competition" },
      { trigger: "need to get buy-in", response: "Totally understand — these decisions involve the whole team. Would it help if I put together a brief one-pager showing the ROI and key benefits? That usually makes internal conversations much easier.", category: "authority" },
      { trigger: "we're too small", response: "Our platform actually scales with you — many of our biggest customers started with small teams. We have plans designed for teams your size. Want me to show you how it works at your scale?", category: "need" },
      { trigger: "what about data security", response: "Great question — security is our top priority. We're SOC 2 compliant, use end-to-end encryption, and your data is always yours. Would you like me to send over our security documentation?", category: "trust" },
      { trigger: "I need a demo first", response: "Absolutely! Let me get you set up with a personalized demo. What time works best this week? I'll make sure we focus on the features most relevant to you.", category: "general" },
    ],
  },

  restaurant: {
    industry: "restaurant",
    display_name: "Restaurant & Hospitality",
    description: "Restaurants, catering, event venues, bars, cafes",
    suggested_greeting: "Thanks for calling! Whether you're looking to make a reservation, place an order, or plan an event, we're happy to help. What can I do for you?",
    key_services: ["Reservations", "Takeout orders", "Catering", "Private events", "Gift cards", "Menu inquiries"],
    qualification_questions: [
      "Is this for a dine-in reservation, takeout, or an event?",
      "How many people will be in your party?",
      "Any dietary restrictions or allergies we should know about?",
      "What date and time are you looking at?",
    ],
    objections: [
      { trigger: "fully booked", response: "I'm sorry about that! I can put you on our waitlist — we often get cancellations. I can also suggest some great alternative times. What works for your schedule?", category: "timing" },
      { trigger: "too pricey", response: "I understand! We have options at different price points, and our portions are generous. We also run specials throughout the week. Can I tell you about those?", category: "pricing" },
      { trigger: "dietary restrictions", response: "We're very accommodating with dietary needs! Our chef can modify most dishes. Let me know what you need and I'll make sure we take great care of you.", category: "general" },
      { trigger: "bad review online", response: "I appreciate you bringing that up. We take all feedback seriously and have made improvements. I think you'll find a different experience if you give us a try. Can I book you a table?", category: "trust" },
    ],
  },

  financial: {
    industry: "financial",
    display_name: "Financial Services",
    description: "Accounting firms, financial advisors, tax preparation, bookkeeping",
    suggested_greeting: "Thank you for calling. We're here to help with your financial needs. How can we assist you today?",
    key_services: ["Tax preparation", "Bookkeeping", "Financial planning", "Auditing", "Payroll", "Business consulting"],
    compliance_notes: "Never give specific financial advice over the phone. Always recommend a consultation. Verify identity before discussing any account details.",
    qualification_questions: [
      "Are you looking for personal or business financial services?",
      "Do you have a specific deadline we should be aware of, like a tax filing date?",
      "Are you currently working with another accountant or advisor?",
      "What's the biggest financial challenge you're facing right now?",
    ],
    objections: [
      { trigger: "I do my own taxes", response: "That's impressive! A lot of DIY filers actually leave money on the table without realizing it. We offer a free tax review where we look at your last return and see if there are savings you missed. No cost, no obligation. Interested?", category: "need" },
      { trigger: "too expensive", response: "I understand cost is a factor. What we find is that our clients typically save significantly more than our fees through deductions and strategies they weren't using. Would a free consultation to see your potential savings be helpful?", category: "pricing" },
      { trigger: "I use software", response: "Tax software is a great tool! Where we add value is with personalized strategy — things software can't catch, like state-specific deductions, business structuring, and year-round planning. Would you like to see the difference?", category: "competition" },
    ],
  },

  education: {
    industry: "education",
    display_name: "Education & Training",
    description: "Schools, tutoring, online courses, training centers, coaching",
    suggested_greeting: "Thanks for your interest in learning with us! How can I help you today?",
    key_services: ["Course enrollment", "Tutoring", "Assessments", "Financial aid", "Schedule management", "Program information"],
    qualification_questions: [
      "What subject or skill are you looking to improve?",
      "Is this for yourself or someone else?",
      "What's your current level of experience with this topic?",
      "What's your ideal start date?",
    ],
    objections: [
      { trigger: "too expensive", response: "Education is an investment, and we want to make it accessible. We have payment plans, scholarships, and flexible options. Let me walk you through what's available for you.", category: "pricing" },
      { trigger: "no time", response: "I totally understand — that's actually why we offer flexible scheduling and self-paced options. Many of our students fit learning into just a few hours a week. Want me to show you how?", category: "timing" },
      { trigger: "I can learn online free", response: "Free resources are great for getting started! What our programs add is structure, expert feedback, a recognized credential, and a support system. If you want to take it to the professional level, we're the next step. Want to learn more?", category: "competition" },
    ],
  },
};

/**
 * Get the industry config for a given industry key.
 * Returns null if the industry isn't in our library.
 */
export function getIndustryConfig(industry: string): IndustryConfig | null {
  // Try exact match first
  if (INDUSTRY_CONFIGS[industry]) return INDUSTRY_CONFIGS[industry];

  // Try normalized match
  const normalized = industry.toLowerCase().replace(/[\s-]+/g, "_");
  if (INDUSTRY_CONFIGS[normalized]) return INDUSTRY_CONFIGS[normalized];

  // Try fuzzy match
  const keys = Object.keys(INDUSTRY_CONFIGS);
  for (const key of keys) {
    const config = INDUSTRY_CONFIGS[key];
    if (
      config.display_name.toLowerCase() === industry.toLowerCase() ||
      config.description.toLowerCase().includes(industry.toLowerCase())
    ) {
      return config;
    }
  }

  return null;
}

/**
 * Get all available industry configs as a list.
 */
export function getAllIndustryConfigs(): IndustryConfig[] {
  return Object.values(INDUSTRY_CONFIGS);
}

/**
 * Merge industry objections into an agent's existing objection set.
 * Industry objections are added as defaults; user-configured objections take priority.
 */
export function mergeIndustryObjections(
  userObjections: Array<{ trigger?: string; response?: string }>,
  industryObjections: IndustryObjection[]
): Array<{ trigger: string; response: string }> {
  const merged: Array<{ trigger: string; response: string }> = [];
  const userTriggers = new Set(
    userObjections
      .map((o) => (o.trigger ?? "").toLowerCase().trim())
      .filter(Boolean)
  );

  // User objections first (highest priority)
  for (const obj of userObjections) {
    const trigger = (obj.trigger ?? "").trim();
    const response = (obj.response ?? "").trim();
    if (trigger && response) {
      merged.push({ trigger, response });
    }
  }

  // Industry objections only if user hasn't already configured a similar trigger
  for (const obj of industryObjections) {
    const triggerLower = obj.trigger.toLowerCase().trim();
    const alreadyHandled = [...userTriggers].some(
      (ut) => ut.includes(triggerLower) || triggerLower.includes(ut)
    );
    if (!alreadyHandled) {
      merged.push({ trigger: obj.trigger, response: obj.response });
    }
  }

  return merged;
}
