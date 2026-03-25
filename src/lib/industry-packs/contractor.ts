import type { IndustryPack } from "./types";

export const contractorPack: IndustryPack = {
  id: "contractor",
  name: "General Contractor & Construction",
  icon: "HardHat",
  greeting: "Thanks for calling {business_name}. Are you looking for an estimate, have a project question, or need to check on an existing job?",
  avgJobValue: 12000,
  appointmentTypes: [
    { name: "Estimate Visit", duration: 60 },
    { name: "Design Consultation", duration: 90 },
    { name: "Project Walkthrough", duration: 45 },
    { name: "Permit Review", duration: 30 },
    { name: "Final Inspection", duration: 30 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "How much does a remodel cost?", a: "Remodel costs vary based on scope, materials, and square footage. I can schedule a free estimate visit so we can give you an accurate quote for your specific project." },
      { q: "Are you licensed and insured?", a: "Yes, we're fully licensed, insured, and bonded. I can provide our license number and insurance certificate." },
      { q: "How long will my project take?", a: "Timeline depends on the project scope. I can have our project manager give you a detailed estimate. Would you like to schedule a consultation?" },
      { q: "Do you offer financing?", a: "Yes, we offer financing options for qualified projects. Our team can walk you through the details during your consultation." },
      { q: "Can I see examples of your work?", a: "Absolutely! We have a portfolio of completed projects. I can send you some examples or schedule a time to walk through them." },
      { q: "Do you handle permits?", a: "Yes, we handle all permitting and inspections as part of the project. That's included in our service." },
    ],
    services: ["Kitchen Remodel", "Bathroom Remodel", "Addition", "Deck/Patio", "Basement Finish", "Siding", "Windows", "Flooring", "Painting", "General Repair"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 120, template: "Hi {name}, we missed your call at {business_name}. Need an estimate or have a project question? Reply or call back!" },
        { channel: "call", delay: 7200, condition: "if_no_reply", script: "Hi {name}, this is {business_name} returning your call. How can we help with your project?" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Estimate Follow-Up",
      type: "quote_chase",
      description: "Follow up on pending estimates",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 3 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, following up on your estimate from {business_name}. Any questions about the project?" },
        { channel: "call", delay: 259200, template: "Hi {name}, {business_name} calling about your project estimate. Do you have a moment?" },
        { channel: "sms", delay: 604800, template: "Last check-in, {name} — we'd love to help with your project. Let us know if you have questions: {booking_link}" },
      ],
    },
    {
      name: "Past Client Reactivation",
      type: "reactivation",
      description: "Re-engage past clients for new projects",
      targetFilter: { days_not_contacted: 365, statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, hope you're still enjoying the work we did! Got any new projects in mind? {business_name} is here to help: {booking_link}" },
      ],
    },
    {
      name: "Post-Project Review",
      type: "review_request",
      description: "Request review after project completion",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 172800, template: "Thanks for choosing {business_name}, {name}! If you're happy with the work, a review would mean the world: {review_link}" },
      ],
    },
  ],
};
