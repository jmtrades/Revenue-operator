import type { IndustryPack } from "./types";

export const movingPack: IndustryPack = {
  id: "moving",
  name: "Moving & Storage",
  icon: "Truck",
  greeting:
    "Thanks for calling {business_name}! Are you looking for a local move, long-distance move, or storage?",
  avgJobValue: 1800,
  appointmentTypes: [
    { name: "In-Home Estimate", duration: 45 },
    { name: "Virtual Video Survey", duration: 30 },
    { name: "Move Day", duration: 240 },
    { name: "Packing Service", duration: 180 },
    { name: "Storage Consultation", duration: 30 },
  ],
  knowledgeBase: {
    commonQuestions: [
      {
        q: "How much does it cost?",
        a: "Move pricing depends on distance, crew size, and what you're moving. The fastest way to get you a binding quote is a quick video survey — 20 minutes on a phone call. Want to schedule one?",
      },
      {
        q: "Are you licensed and insured?",
        a: "Yes — we're fully licensed and insured. For interstate moves we operate under USDOT #{usdot_number}. I can email our certificate of insurance if you'd like.",
      },
      {
        q: "Do you provide packing materials?",
        a: "Yes, we offer full packing, partial packing, and self-pack with supplies. Which works best for you?",
      },
      {
        q: "How much notice do you need?",
        a: "For smaller local moves, sometimes as little as a week. Long-distance moves and peak summer dates often need 2-4 weeks. What's your target move date?",
      },
      {
        q: "Do you offer storage?",
        a: "Yes — climate-controlled and standard storage, by the month or for long-term. Can I check availability for your date?",
      },
    ],
    services: [
      "Local Moves",
      "Long-Distance Moves",
      "Interstate Moves",
      "Packing & Unpacking",
      "Storage (Short & Long Term)",
      "Piano & Specialty Items",
      "Commercial / Office Moves",
      "Senior Move Management",
    ],
  },
  inboundWorkflows: [
    {
      name: "Quote Request Recovery",
      trigger: "missed_call",
      steps: [
        {
          channel: "sms",
          delay: 120,
          template:
            "Hi {name}, {business_name} here — sorry we missed you! What's your move date and zip-to-zip? I'll get you a ballpark right away.",
        },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Estimate → Booking Follow-Up",
      type: "quote_chase",
      description: "Convert estimates into booked moves before the customer calls a competitor.",
      targetFilter: { statuses: ["estimated"], days_not_contacted: 2 },
      sequence: [
        {
          channel: "sms",
          delay: 0,
          template:
            "Hi {name}, {business_name} following up on your estimate. Want me to lock in {move_date}? Slots for that weekend go fast.",
        },
        {
          channel: "call",
          delay: 172800,
          template:
            "Hi {name}, checking in on your move quote. Anything you want me to walk through again or adjust?",
        },
      ],
    },
    {
      name: "Prior-Customer Reactivation",
      type: "reactivation",
      description:
        "Past customers are often moving again or know someone who is.",
      targetFilter: { days_not_contacted: 365, statuses: ["past_customer"] },
      sequence: [
        {
          channel: "sms",
          delay: 0,
          template:
            "Hi {name}, {business_name} here. Hope the new place is feeling like home! If you or a friend are moving again we'll give you $100 off for coming back.",
        },
      ],
    },
  ],
};
