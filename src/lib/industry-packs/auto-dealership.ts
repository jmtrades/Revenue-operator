import type { IndustryPack } from "./types";

export const autoDealershipPack: IndustryPack = {
  id: "auto_dealership",
  name: "Auto Dealership",
  icon: "Car",
  greeting:
    "Thanks for calling {business_name}! Are you looking to buy, sell, or service a vehicle today?",
  avgJobValue: 32000,
  appointmentTypes: [
    { name: "Test Drive", duration: 45 },
    { name: "Sales Consultation", duration: 60 },
    { name: "Trade-In Appraisal", duration: 30 },
    { name: "Financing Consultation", duration: 45 },
    { name: "Service Appointment", duration: 60 },
  ],
  knowledgeBase: {
    commonQuestions: [
      {
        q: "Do you have {make} {model} in stock?",
        a: "Let me check current inventory for you — can I grab your name and a phone number so I can text you a direct link to what we have?",
      },
      {
        q: "What financing do you offer?",
        a: "We work with multiple lenders and can help you find a rate that fits your budget. Pre-approval takes a few minutes. Want to start that now?",
      },
      {
        q: "Will you take my trade-in?",
        a: "Absolutely — we buy trades daily. If you tell me year, make, mileage and condition I can get you a ballpark, and we'll finalize with an in-person appraisal.",
      },
      {
        q: "Is the price negotiable?",
        a: "Every deal depends on the specific vehicle and your financing. The best way to get the right number is to come in so we can run it together. When works for you?",
      },
      {
        q: "Do you deliver?",
        a: "Yes — we offer home delivery within our service area. Want me to check if your address qualifies?",
      },
    ],
    services: [
      "New Vehicle Sales",
      "Used Vehicle Sales",
      "Certified Pre-Owned",
      "Trade-In Appraisal",
      "Financing & Leasing",
      "Home Delivery",
      "Service & Parts",
      "Extended Warranty",
    ],
  },
  inboundWorkflows: [
    {
      name: "Missed Sales Call Recovery",
      trigger: "missed_call",
      steps: [
        {
          channel: "sms",
          delay: 120,
          template:
            "Hi {name}, {business_name} here — sorry we missed you! Which vehicle caught your eye? Reply and I'll send info + a test-drive slot.",
        },
        {
          channel: "call",
          delay: 3600,
          condition: "if_no_reply",
          script:
            "Hi {name}, calling you back from {business_name}. I saw you reached out — what vehicle were you interested in? I can check availability right now.",
        },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Post-Test-Drive Follow-Up",
      type: "quote_chase",
      description:
        "Convert test-drivers into closed deals with a timely follow-up + buyer's-guide reminder.",
      targetFilter: { statuses: ["test_driven"], days_not_contacted: 1 },
      sequence: [
        {
          channel: "sms",
          delay: 0,
          template:
            "Hi {name}, this is {business_name}. How did the test drive feel? The Buyer's Guide we went over covers the warranty — any questions before we pencil in next steps?",
        },
        {
          channel: "call",
          delay: 172800,
          template:
            "Hi {name}, following up on your test drive at {business_name}. Want me to lock that vehicle in with a refundable hold while you think it over?",
        },
      ],
    },
    {
      name: "Lease-End Reactivation",
      type: "reactivation",
      description:
        "Reach out 90 days before a customer's lease ends to offer renewal or purchase.",
      targetFilter: { days_not_contacted: 60, statuses: ["lease_ending"] },
      sequence: [
        {
          channel: "sms",
          delay: 0,
          template:
            "Hi {name}, your lease with {business_name} ends soon. Want me to run numbers on a new lease, purchase, or trade-in?",
        },
      ],
    },
  ],
};
