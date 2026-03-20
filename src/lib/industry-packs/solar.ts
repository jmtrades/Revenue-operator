import type { IndustryPack } from "./types";

export const solarPack: IndustryPack = {
  id: "solar",
  name: "Solar & Energy",
  icon: "Sun",
  greeting: "Thanks for calling {business_name}. Are you interested in solar, have a question about an existing system, or need service?",
  avgJobValue: 18000,
  appointmentTypes: [
    { name: "Site Assessment", duration: 60 },
    { name: "Design Consultation", duration: 45 },
    { name: "Installation", duration: 480 },
    { name: "Maintenance", duration: 60 },
    { name: "System Inspection", duration: 45 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "How much does solar cost?", a: "Solar system pricing depends on your home size, energy usage, and available incentives. I can schedule a free assessment to give you an accurate estimate." },
      { q: "What incentives are available?", a: "There are federal tax credits, and your state may have additional rebates. Our team can walk you through all available incentives during a consultation." },
      { q: "How long does installation take?", a: "Most residential installations take 1-3 days. The full process from consultation to activation is typically 4-8 weeks." },
      { q: "Will solar work on my roof?", a: "Most roofs work well for solar. We'd need to assess your roof orientation, shading, and condition. Can I schedule a free site assessment?" },
      { q: "Do you offer financing?", a: "Yes, we offer several financing options including $0-down plans. Our team can walk you through all the options." },
      { q: "What happens on cloudy days?", a: "Solar panels still produce energy on cloudy days, just at reduced capacity. Your system is designed to account for weather patterns in your area." },
    ],
    services: ["Solar Panel Installation", "Battery Storage", "System Maintenance", "Roof Assessment", "Energy Audit", "EV Charger Installation"],
  },
  inboundWorkflows: [
    {
      name: "Missed Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 120, template: "Hi {name}, we missed your call at {business_name}. Interested in solar? Reply or call us back for a free assessment!" },
        { channel: "call", delay: 7200, condition: "if_no_reply", script: "Hi {name}, this is {business_name} returning your call about solar. Do you have a few minutes?" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Assessment Follow-Up",
      type: "quote_chase",
      description: "Follow up after site assessment",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 3 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, following up on your solar assessment with {business_name}. Any questions about the proposal?" },
        { channel: "call", delay: 259200, template: "Hi {name}, {business_name} calling to discuss your solar proposal. Do you have a moment?" },
      ],
    },
    {
      name: "Incentive Deadline Reactivation",
      type: "reactivation",
      description: "Re-engage leads before incentive deadlines",
      targetFilter: { days_not_contacted: 60, statuses: ["inactive", "inquiry"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, solar incentives in your area may be changing soon. Want to lock in current rates? {booking_link}" },
      ],
    },
  ],
};
