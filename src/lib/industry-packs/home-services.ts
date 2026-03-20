import type { IndustryPack } from "./types";

export const homeServicesPack: IndustryPack = {
  id: "home_services",
  name: "Home Services & Cleaning",
  icon: "Sparkles",
  greeting: "Thanks for calling {business_name}. Are you looking for a quote, need to schedule service, or have a question?",
  avgJobValue: 350,
  appointmentTypes: [
    { name: "Standard Cleaning", duration: 120 },
    { name: "Deep Cleaning", duration: 240 },
    { name: "Move-In/Out Cleaning", duration: 300 },
    { name: "Estimate Visit", duration: 30 },
    { name: "Recurring Service", duration: 120 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "How much does cleaning cost?", a: "Pricing depends on the size of your home and type of service. Can I get your address and a few details to give you an accurate quote?" },
      { q: "Do you bring your own supplies?", a: "Yes, we bring all supplies and equipment. If you have preferred products, just let us know." },
      { q: "Are you insured?", a: "Absolutely. We're fully insured and bonded for your peace of mind." },
      { q: "Do you offer recurring service?", a: "Yes! We offer weekly, bi-weekly, and monthly options — with discounts for recurring clients." },
      { q: "How many people come for a cleaning?", a: "Team size depends on the job. Typically 2-3 cleaners for a standard home. We'll confirm before your service." },
    ],
    services: ["Standard Cleaning", "Deep Cleaning", "Move-In/Out", "Office Cleaning", "Carpet Cleaning", "Window Cleaning", "Pressure Washing", "Organizing"],
  },
  inboundWorkflows: [
    {
      name: "Missed Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 120, template: "Hi {name}, we missed your call at {business_name}. Need a cleaning quote? Reply or call us back!" },
        { channel: "call", delay: 7200, condition: "if_no_reply", script: "Hi {name}, this is {business_name} returning your call. How can we help?" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Seasonal Deep Clean",
      type: "reactivation",
      description: "Promote seasonal deep cleaning",
      targetFilter: { days_not_contacted: 90, statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, time for a seasonal deep clean? {business_name} has openings this week! Book: {booking_link}" },
      ],
    },
    {
      name: "Quote Follow-Up",
      type: "quote_chase",
      description: "Follow up on pending quotes",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 2 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, following up on your cleaning quote from {business_name}. Ready to schedule?" },
        { channel: "call", delay: 172800, template: "Hi {name}, {business_name} calling about your quote. Any questions?" },
      ],
    },
    {
      name: "Post-Service Review",
      type: "review_request",
      description: "Ask for review after service",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for choosing {business_name}, {name}! How was the service? Leave a review: {review_link}" },
      ],
    },
  ],
};
