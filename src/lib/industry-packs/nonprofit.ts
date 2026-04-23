import type { IndustryPack } from "./types";

export const nonprofitPack: IndustryPack = {
  id: "nonprofit",
  name: "Nonprofit",
  icon: "HeartHandshake",
  greeting:
    "Thanks for calling {business_name}! Are you looking to make a donation, volunteer, get services, or something else?",
  avgJobValue: 250,
  appointmentTypes: [
    { name: "Donor Meeting", duration: 45 },
    { name: "Volunteer Orientation", duration: 60 },
    { name: "Program Intake", duration: 30 },
    { name: "Board Introduction", duration: 60 },
    { name: "Grant Stewardship Call", duration: 45 },
  ],
  knowledgeBase: {
    commonQuestions: [
      {
        q: "How do I donate?",
        a: "You can donate online at {donation_link}, by phone right now, or by mail. Which is easiest for you?",
      },
      {
        q: "Is my donation tax-deductible?",
        a: "Yes — {business_name} is a 501(c)(3) tax-exempt organization, so your donation is tax-deductible to the full extent allowed by law. We'll email you a receipt.",
      },
      {
        q: "How do you use donations?",
        a: "The majority goes directly to program services — I can send you our most recent annual report with the exact breakdown. What's your email?",
      },
      {
        q: "How do I volunteer?",
        a: "We'd love your help! The first step is a short orientation call so we can match you with the right opportunity. When works for you this week?",
      },
      {
        q: "Do you offer services to someone in need?",
        a: "Yes — let me learn a little about the situation so I can point you to the right program. Is this for yourself or someone you're helping?",
      },
    ],
    services: [
      "Individual Donations",
      "Recurring Giving",
      "Planned Giving",
      "Corporate Sponsorships",
      "Grant Stewardship",
      "Volunteer Programs",
      "Beneficiary Services",
      "Fundraising Events",
    ],
  },
  inboundWorkflows: [
    {
      name: "Donor Inquiry Follow-Up",
      trigger: "missed_call",
      steps: [
        {
          channel: "sms",
          delay: 120,
          template:
            "Hi {name}, {business_name} here. Sorry we missed you! Were you calling about donating, volunteering, or our services? Reply and I'll connect you with the right person.",
        },
      ],
    },
    {
      name: "Volunteer Onboarding Nudge",
      trigger: "appointment_booked",
      steps: [
        {
          channel: "email",
          delay: 0,
          template:
            "Subject: Welcome to {business_name}!\n\nHi {name}, thank you for offering your time. Here's what to expect at orientation: {orientation_agenda}. Reply with any questions.",
        },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Lapsed Donor Reactivation",
      type: "reactivation",
      description: "Reach out to donors who haven't given in 18+ months.",
      targetFilter: { days_not_contacted: 540, statuses: ["lapsed_donor"] },
      sequence: [
        {
          channel: "email",
          delay: 0,
          template:
            "Subject: We still think of you, {name}\n\nHi {name}, your past support made {past_impact_example} possible. Here's what you'd make possible today: {current_need}. Would a small gift be meaningful?",
        },
        {
          channel: "call",
          delay: 345600,
          template:
            "Hi {name}, {business_name} here. I wanted to thank you personally for your past support and share a story of someone your previous gift helped. Do you have a minute?",
        },
      ],
    },
    {
      name: "End-of-Year Appeal",
      type: "review_request",
      description: "December appeal to existing donors for year-end giving.",
      targetFilter: { statuses: ["active_donor"] },
      sequence: [
        {
          channel: "email",
          delay: 0,
          template:
            "Subject: One last chance for a 2025 tax-deductible gift\n\nHi {name}, if you'd like a tax-deductible gift to count toward this year, tonight is the deadline. Here's the link: {donation_link}.",
        },
      ],
    },
  ],
};
