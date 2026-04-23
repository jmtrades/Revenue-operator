import type { IndustryPack } from "./types";

export const saasPack: IndustryPack = {
  id: "saas",
  name: "SaaS / B2B Software",
  icon: "Cloud",
  greeting:
    "Thanks for reaching out to {business_name}! Are you looking for a demo, pricing, or technical questions?",
  avgJobValue: 18000,
  appointmentTypes: [
    { name: "Discovery Call", duration: 30 },
    { name: "Product Demo", duration: 45 },
    { name: "Technical Deep-Dive", duration: 60 },
    { name: "Security Review", duration: 45 },
    { name: "Onboarding Kickoff", duration: 60 },
  ],
  knowledgeBase: {
    commonQuestions: [
      {
        q: "How much does it cost?",
        a: "Pricing depends on seats and what modules you need. The fastest path is a 20-minute discovery call — I'll show pricing for your exact use case. Want me to put one on the calendar?",
      },
      {
        q: "Do you have an API?",
        a: "Yes, we have a REST API, webhooks, and SDKs. I can send you the developer docs and set up a quick call with our solutions team if you want to validate an integration.",
      },
      {
        q: "Are you SOC 2 compliant?",
        a: "Let me have our security team send you the latest certifications and SOC 2 Type II report rather than paraphrasing — want to put you directly in touch with compliance?",
      },
      {
        q: "Can I self-serve or do I need sales?",
        a: "We support both — individuals and small teams can sign up directly, and larger teams usually benefit from a quick scoping call. Which sounds closer to your team?",
      },
      {
        q: "Do you offer a free trial?",
        a: "Yes — 14-day free trial with no credit card. I can spin one up right now if you give me your work email.",
      },
    ],
    services: [
      "Product Demo",
      "Free Trial Setup",
      "Pilot / Proof of Concept",
      "Technical Integration Support",
      "Security Review",
      "Annual Contract",
      "Enterprise Agreement",
      "Customer Success Onboarding",
    ],
  },
  inboundWorkflows: [
    {
      name: "Inbound Demo Request Recovery",
      trigger: "missed_call",
      steps: [
        {
          channel: "sms",
          delay: 60,
          template:
            "Hi {name}, {business_name} here — sorry we missed you! Would a 20-min demo tomorrow work? Reply with a time and I'll send a calendar invite.",
        },
        {
          channel: "email",
          delay: 1800,
          condition: "if_no_reply",
          template:
            "Subject: Quick demo of {business_name}?\n\nHi {name},\n\nI saw you called earlier. Here are a few 20-minute slots tomorrow: {calendar_link}. I'll tailor the demo to what you're actually trying to solve — reply with the problem you're tackling and I'll come prepared.",
        },
      ],
    },
    {
      name: "Trial → Paid Conversion",
      trigger: "appointment_booked",
      steps: [
        {
          channel: "email",
          delay: 0,
          template:
            "Hi {name}, looking forward to our call. To make it useful, can you share: (1) team size, (2) current tooling, (3) what outcome would make this worth doing? I'll prep accordingly.",
        },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Dormant Trial Reactivation",
      type: "reactivation",
      description:
        "Re-engage trial users who signed up but stalled before converting.",
      targetFilter: { days_not_contacted: 7, statuses: ["trial_stalled"] },
      sequence: [
        {
          channel: "email",
          delay: 0,
          template:
            "Subject: Stuck on {business_name}?\n\nHi {name}, I noticed you started a trial but haven't come back. What got in the way? Reply and I'll either help unstick you or give you more time on the trial.",
        },
        {
          channel: "call",
          delay: 172800,
          template:
            "Hi {name}, {business_name} here. I'm not calling to push a sale — just checking if there was something that blocked you during the trial. I'd love to understand what didn't work.",
        },
      ],
    },
    {
      name: "Pipeline Closed-Lost Revisit",
      type: "reactivation",
      description: "Re-open closed-lost deals from 6+ months ago.",
      targetFilter: { days_not_contacted: 180, statuses: ["closed_lost"] },
      sequence: [
        {
          channel: "email",
          delay: 0,
          template:
            "Subject: Worth another look?\n\nHi {name}, we've shipped {new_capability} since we last talked. Would a 15-minute update be worth your time?",
        },
      ],
    },
  ],
};
