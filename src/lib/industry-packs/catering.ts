import type { IndustryPack } from "./types";

export const cateringPack: IndustryPack = {
  id: "catering",
  name: "Catering",
  icon: "ChefHat",
  greeting:
    "Thanks for calling {business_name}! Are you booking a specific event, or just looking at options?",
  avgJobValue: 2200,
  appointmentTypes: [
    { name: "Menu Tasting", duration: 60 },
    { name: "Event Consultation", duration: 45 },
    { name: "Venue Walk-Through", duration: 60 },
    { name: "Event Day Setup", duration: 120 },
  ],
  knowledgeBase: {
    commonQuestions: [
      {
        q: "What's the per-person price?",
        a: "Per-person pricing depends on menu and service style. If you tell me event type, headcount, and date I can send you a proposal within the hour.",
      },
      {
        q: "Do you accommodate dietary restrictions?",
        a: "Yes — vegetarian, vegan, gluten-free, kosher, halal, and common allergies. Let me know your guest breakdown and we'll build the menu around it.",
      },
      {
        q: "How far in advance should I book?",
        a: "For weekend events we recommend 4-6 weeks, for weekday 2-3 weeks. Rush bookings are possible but menu options narrow. What's your target date?",
      },
      {
        q: "Do you provide staff, dishes, and linens?",
        a: "Yes — full-service catering includes servers, bartenders, linens, flatware, and glassware. We also do drop-off only if you prefer. Which fits better?",
      },
      {
        q: "What's your deposit and cancellation policy?",
        a: "I'd rather read you our exact policy than paraphrase — want me to email the contract and catering agreement now?",
      },
    ],
    services: [
      "Corporate Catering",
      "Weddings",
      "Private Events",
      "Drop-Off Catering",
      "Full-Service Events",
      "Bartending Service",
      "Menu Tasting",
      "Custom Menu Design",
    ],
  },
  inboundWorkflows: [
    {
      name: "RFP → Proposal Follow-Up",
      trigger: "missed_call",
      steps: [
        {
          channel: "sms",
          delay: 60,
          template:
            "Hi {name}, {business_name} catering here — sorry we missed you! What's the event date, headcount, and style (plated, buffet, stations)? I'll send a proposal today.",
        },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Proposal → Booking",
      type: "quote_chase",
      description: "Convert catering proposals into signed contracts.",
      targetFilter: { statuses: ["proposal_sent"], days_not_contacted: 2 },
      sequence: [
        {
          channel: "email",
          delay: 0,
          template:
            "Subject: {event_date} catering — anything you'd like to adjust?\n\nHi {name}, following up on the proposal for your {event_type}. Want me to tweak the menu, timing, or headcount? Happy to jump on a quick call.",
        },
        {
          channel: "call",
          delay: 259200,
          template:
            "Hi {name}, {business_name} catering checking in on your event. Want me to hold the date while you finalize?",
        },
      ],
    },
    {
      name: "Post-Event Referral",
      type: "review_request",
      description:
        "After a successful event, ask for a review and referral while the impression is fresh.",
      targetFilter: { statuses: ["event_completed"], days_not_contacted: 3 },
      sequence: [
        {
          channel: "email",
          delay: 0,
          template:
            "Subject: Thank you for letting us cater your event!\n\nHi {name}, thank you for trusting us with {event_name}. If you have 60 seconds, would you leave us a review? {review_link}. And anyone you'd recommend us to gets $100 off their event.",
        },
      ],
    },
  ],
};
