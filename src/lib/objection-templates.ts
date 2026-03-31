/**
 * Industry-specific objection handling templates
 * Provides pre-built responses for common sales objections
 */

export type IndustryType =
  | "healthcare"
  | "legal"
  | "real_estate"
  | "hvac"
  | "plumbing"
  | "dental"
  | "automotive"
  | "saas"
  | "consulting"
  | "fitness"
  | "default";

export type ObjectionType = "price" | "timing" | "competitor" | "notInterested";

export interface ObjectionTemplates {
  price: string;
  timing: string;
  competitor: string;
  notInterested: string;
}

const INDUSTRY_TEMPLATES: Record<IndustryType, ObjectionTemplates> = {
  healthcare: {
    price:
      "I understand cost is a concern. We work with most major insurance providers and offer flexible payment plans to fit your budget. Plus, our preventive approach often reduces overall healthcare costs in the long run.",
    timing:
      "I appreciate your honesty. The best time to start is now so we can establish a baseline and get you on the path to better health. We offer convenient appointment times that work with your schedule.",
    competitor:
      "I'm glad you're exploring your options. What sets us apart is our personalized care approach and our track record of patient outcomes. I'd love to discuss how our approach differs from what you've seen elsewhere.",
    notInterested:
      "I completely understand. Before you go, I'd like to make sure you have all the information about how we can help with your specific health goals. Would a brief conversation hurt?",
  },

  legal: {
    price:
      "Our initial consultation is complimentary, so there's no cost to explore your options. For ongoing representation, we offer transparent fee structures, including hourly billing, flat fees, and contingency-based arrangements depending on your case.",
    timing:
      "The sooner we get involved, the better we can protect your interests. Legal matters often have time-sensitive components, and delay can weaken your position. Let's discuss your situation now.",
    competitor:
      "Many clients have tried handling this themselves or with other counsel. What we bring is specialized expertise in your specific area and a proven track record of successful outcomes. I'd like to discuss what's unique about your case.",
    notInterested:
      "I respect that. Before you decide, I want to make sure you understand the full implications of your situation and what's at stake. A quick conversation could clarify things. What if I can show you why this matters?",
  },

  real_estate: {
    price:
      "Our commission structure is competitive and standard in the industry. More importantly, we provide a comprehensive market analysis, professional marketing, and our strong network leads to faster sales and better prices. The ROI speaks for itself.",
    timing:
      "Real estate market timing is critical. Whether it's high inventory or low, we know how to position your property to sell faster and at the best price. Starting now ensures we capture the best conditions.",
    competitor:
      "I appreciate you exploring your options. Our approach is different because we combine detailed market knowledge with a strong buyer network. Would you be open to a brief consultation to see how we compare?",
    notInterested:
      "I understand. Many sellers feel this way initially. But whether you're selling now or in the future, having a professional assessment of your property's value and market position is valuable. Could we schedule a quick market analysis?",
  },

  hvac: {
    price:
      "We offer free estimates with no obligation, so you can see our pricing upfront. Our transparent pricing policy means no hidden fees. Plus, our energy-efficient solutions often lead to lower utility bills that pay for the investment over time.",
    timing:
      "HVAC issues tend to get worse and more expensive if delayed. Getting ahead of problems saves you money and keeps your system running efficiently. We can get you on the schedule quickly.",
    competitor:
      "We're happy to match competitive quotes and stand behind our work with a solid warranty. Our reputation is built on quality workmanship and customer service. I'd love to earn your business.",
    notInterested:
      "I get it. But whether now or later, you'll eventually need HVAC services. When you're ready, we'll be here. In the meantime, would a quick maintenance check be worth your peace of mind?",
  },

  plumbing: {
    price:
      "We provide free estimates so you know exactly what you're paying before we begin. No surprises. Our upfront pricing policy and quality workmanship mean you get the best value for your money.",
    timing:
      "Plumbing problems only get worse and more expensive if ignored. Water damage can lead to major repairs. Addressing this now prevents costly problems down the road.",
    competitor:
      "We've earned our reputation through quality work and fair pricing. Our team is licensed, insured, and stands behind every job with a warranty. I'd welcome the chance to show you the difference.",
    notInterested:
      "No pressure at all. But plumbing emergencies don't wait. When you need reliable service, remember us. How about a quick inspection to make sure there are no hidden issues?",
  },

  dental: {
    price:
      "We offer flexible payment options and work with most dental insurance plans. We also provide treatment plans that prioritize your immediate needs and budget. Our preventive approach reduces costly procedures down the road.",
    timing:
      "Dental issues don't improve on their own—they typically get worse and more expensive to treat. Starting now helps prevent more serious problems. Plus, we can often fit you in quickly.",
    competitor:
      "I'm glad you're taking your dental health seriously. We're committed to personalized care and the latest techniques. What would make you feel confident about choosing us for your dental care?",
    notInterested:
      "I respect that. But your oral health is important, and regular professional care is the best investment in your smile. When you're ready, we'd love to be your dental partner.",
  },

  automotive: {
    price:
      "We offer competitive pricing on all services with transparent estimates before we start any work. We also provide warranty coverage on parts and labor, giving you assurance on your investment.",
    timing:
      "Regular maintenance now prevents costly breakdowns later. Small issues become expensive problems if ignored. We can get you in quickly and keep your vehicle reliable.",
    competitor:
      "We combine experienced technicians with quality parts and fair pricing. Our reputation is built on reliability and customer trust. Let us prove why we're the better choice.",
    notInterested:
      "No worries. Whenever your vehicle needs service, we're here to help. A quick inspection could identify any issues before they become problems. Would that be helpful?",
  },

  saas: {
    price:
      "ROI is what matters. Our pricing models are flexible—from startups to enterprise. Most of our customers see payback within the first few months through efficiency gains and cost savings. We can structure a plan that works for your budget.",
    timing:
      "The faster you implement, the sooner you start seeing results. Most teams realize improvements within the first 30 days. We offer quick onboarding and ongoing support to ensure success.",
    competitor:
      "We've built our solution specifically to outperform alternatives in [key differentiator]. Plus, our customer success team ensures you get real value, not just software. I'd love to show you the difference.",
    notInterested:
      "I understand. Many teams told us they weren't interested until they saw what they were missing. Would a brief demo or customer success story change your mind?",
  },

  consulting: {
    price:
      "Our fees reflect the value we deliver. Most clients see ROI through improved efficiency, revenue growth, or cost savings that far exceed our investment. We're happy to discuss engagement models that align with your budget.",
    timing:
      "The market waits for no one. Competitors are making moves now. The strategic advantage goes to companies that act decisively. Let's discuss how we can accelerate your timeline.",
    competitor:
      "What differentiates us is our approach and our team's specific expertise. We don't just advise—we execute alongside you. Would you be open to discussing how we're different?",
    notInterested:
      "I appreciate your candor. Before you decide, I'd like to share one key insight that might change your perspective. Could we schedule 15 minutes?",
  },

  fitness: {
    price:
      "We offer flexible membership options to fit every budget, from starter plans to premium. Plus, the investment in your health pays dividends in energy, productivity, and wellbeing. Most members say they'd pay more.",
    timing:
      "There's no better time than now to invest in your health. You'll notice improvements in energy and mood within weeks. The sooner you start, the sooner you feel the benefits.",
    competitor:
      "We're not just a gym—we're a community committed to your success. Our team of coaches, the environment, and our proven programs set us apart. Why not try us out?",
    notInterested:
      "I get it. Fitness takes commitment. But think of us as your partner in health. A free trial lets you experience our approach with no obligation. Would that work?",
  },

  default: {
    price:
      "We understand budget is important. Let me explain the value we provide and why our pricing is competitive. We often find ways to optimize costs while maintaining quality.",
    timing:
      "Timing is crucial. The sooner we get started, the sooner you'll see results. We're confident that quick action will prove the value of our solution.",
    competitor:
      "I appreciate you exploring your options. What sets us apart is [your key differentiator]. I'd love to discuss how we compare and why clients choose us.",
    notInterested:
      "I respect that. But before you make a final decision, would you be open to one more conversation? I have a suspicion we might be a better fit than you think.",
  },
};

/**
 * Get objection handling templates for a specific industry
 */
export function getObjectionTemplates(industry: IndustryType): ObjectionTemplates {
  return INDUSTRY_TEMPLATES[industry] || INDUSTRY_TEMPLATES.default;
}

/**
 * Detect industry from agent's business context, industry field, or services
 */
export function detectIndustry(
  businessContext?: string,
  industryField?: string,
  services?: string[]
): IndustryType {
  const text = [businessContext, industryField, services?.join(" ")].filter(Boolean).join(" ").toLowerCase();

  // Healthcare keywords
  if (
    text.includes("healthcare") ||
    text.includes("medical") ||
    text.includes("doctor") ||
    text.includes("clinic") ||
    text.includes("hospital") ||
    text.includes("physician") ||
    text.includes("therapy")
  ) {
    return "healthcare";
  }

  // Legal keywords
  if (text.includes("law") || text.includes("legal") || text.includes("attorney") || text.includes("lawyer")) {
    return "legal";
  }

  // Real estate keywords
  if (
    text.includes("real estate") ||
    text.includes("realtor") ||
    text.includes("property") ||
    text.includes("realty")
  ) {
    return "real_estate";
  }

  // HVAC keywords
  if (
    text.includes("hvac") ||
    text.includes("air conditioning") ||
    text.includes("heating") ||
    text.includes("climate control")
  ) {
    return "hvac";
  }

  // Plumbing keywords
  if (text.includes("plumb") || text.includes("pipe") || text.includes("water")) {
    return "plumbing";
  }

  // Dental keywords
  if (text.includes("dental") || text.includes("dentist") || text.includes("orthodont")) {
    return "dental";
  }

  // Automotive keywords
  if (
    text.includes("automotive") ||
    text.includes("mechanic") ||
    text.includes("auto repair") ||
    text.includes("car service")
  ) {
    return "automotive";
  }

  // SaaS keywords
  if (
    text.includes("software") ||
    text.includes("saas") ||
    text.includes("platform") ||
    text.includes("app") ||
    text.includes("cloud")
  ) {
    return "saas";
  }

  // Consulting keywords
  if (
    text.includes("consulting") ||
    text.includes("consultant") ||
    text.includes("strategic") ||
    text.includes("business development")
  ) {
    return "consulting";
  }

  // Fitness keywords
  if (
    text.includes("fitness") ||
    text.includes("gym") ||
    text.includes("training") ||
    text.includes("wellness") ||
    text.includes("personal trainer")
  ) {
    return "fitness";
  }

  return "default";
}
