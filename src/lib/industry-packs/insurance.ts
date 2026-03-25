import type { IndustryPack } from "./types";

export const insurancePack: IndustryPack = {
  id: "insurance",
  name: "Insurance Agency",
  icon: "Shield",
  greeting: "Thanks for calling {business_name}. Are you looking for a quote, need to file a claim, or have a question about your policy?",
  avgJobValue: 1800,
  appointmentTypes: [
    { name: "Quote Consultation", duration: 30 },
    { name: "Policy Review", duration: 45 },
    { name: "Claims Consultation", duration: 60 },
    { name: "New Client Onboarding", duration: 30 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "How much is insurance?", a: "Rates depend on coverage type and your specific situation. I can schedule a quick consultation to get you an accurate quote. What type of coverage are you looking for?" },
      { q: "Can I get a quote?", a: "Absolutely! I'll need a few details. What type of insurance are you looking for — auto, home, life, or business?" },
      { q: "How do I file a claim?", a: "I'm sorry you need to file a claim. Let me connect you with our claims team or take down the details so they can follow up." },
      { q: "Do you offer bundling discounts?", a: "Yes, bundling multiple policies often saves significantly. Would you like to discuss your options?" },
      { q: "Can I change my coverage?", a: "Of course! Let me have an agent review your current policy and walk you through your options." },
    ],
    services: ["Auto Insurance", "Home Insurance", "Life Insurance", "Business Insurance", "Health Insurance", "Umbrella Policy", "Renters Insurance"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 120, template: "Hi {name}, we missed your call at {business_name}. Need a quote or have a question? Reply or call back!" },
        { channel: "call", delay: 7200, condition: "if_no_reply", script: "Hi {name}, this is {business_name} returning your call. How can we help?" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Policy Renewal Reminder",
      type: "reactivation",
      description: "Remind clients about upcoming policy renewals",
      targetFilter: { days_not_contacted: 330, statuses: ["active"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, your policy with {business_name} is coming up for renewal. Want to review your coverage? {booking_link}" },
        { channel: "call", delay: 259200, template: "Hi {name}, this is {business_name}. Your policy renewal is approaching. Do you have a moment to review?" },
      ],
    },
    {
      name: "Quote Follow-Up",
      type: "quote_chase",
      description: "Follow up on pending quotes",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 2 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, following up on your insurance quote from {business_name}. Any questions? Ready to move forward?" },
        { channel: "call", delay: 172800, template: "Hi {name}, {business_name} calling about your quote. Do you have a moment?" },
      ],
    },
  ],
};
