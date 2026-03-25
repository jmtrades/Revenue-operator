import type { IndustryPack } from "./types";

export const roofingPack: IndustryPack = {
  id: "roofing",
  name: "Roofing & Restoration",
  icon: "Home",
  greeting: "Thanks for calling {business_name}. Are you calling about an inspection, repair, or insurance claim?",
  avgJobValue: 12000,
  appointmentTypes: [
    { name: "Inspection", duration: 60 },
    { name: "Repair estimate", duration: 45 },
    { name: "Replacement consult", duration: 90 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Do you work with insurance?", a: "Yes, we work with insurance on storm and damage claims. I can get your information to our team." },
    ],
    services: ["Inspection", "Repair", "Replacement", "Storm damage", "Insurance claim"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 120, template: "Hi {name}, {business_name} missed your call. Storm or roof issue? Reply and we'll call back fast." },
        { channel: "call", delay: 3600, condition: "if_no_reply", script: "Hi {name}, {business_name} following up. Still need help with your roof?" },
      ],
    },
    {
      name: "Quote Follow-Up",
      trigger: "quote_sent",
      steps: [
        { channel: "sms", delay: 259200, template: "Hi {name}, following up on your estimate from {business_name}. Questions?" },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "We missed you at your inspection slot with {business_name}. Reschedule?" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Storm Lead Chase",
      type: "quote_chase",
      description: "Follow up storm inquiries",
      targetFilter: { statuses: ["new"], days_not_contacted: 1 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, {business_name} here about your roof inquiry. Can we schedule an inspection?" },
        { channel: "call", delay: 86400, template: "Hi {name}, calling from {business_name} about your roof. Got a minute?" },
      ],
    },
  ],
};
