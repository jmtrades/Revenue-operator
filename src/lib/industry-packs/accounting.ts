import type { IndustryPack } from "./types";

export const accountingPack: IndustryPack = {
  id: "accounting",
  name: "Accounting & Tax",
  icon: "Calculator",
  greeting: "Thanks for calling {business_name}. Are you calling about tax preparation, bookkeeping, or have a financial question?",
  avgJobValue: 1500,
  appointmentTypes: [
    { name: "Tax Consultation", duration: 60 },
    { name: "Tax Preparation", duration: 90 },
    { name: "Bookkeeping Review", duration: 45 },
    { name: "Business Advisory", duration: 60 },
    { name: "New Client Onboarding", duration: 45 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "How much does tax preparation cost?", a: "Tax prep costs depend on the complexity of your return — individual vs. business, deductions, etc. I can schedule a consultation to give you an accurate quote." },
      { q: "What documents do I need?", a: "Typical documents include W-2s, 1099s, mortgage interest statements, and receipts for deductions. We'll send you a checklist after scheduling." },
      { q: "Can you help with back taxes?", a: "Absolutely. We help clients resolve back tax issues. Would you like to schedule a consultation to discuss your situation?" },
      { q: "Do you work with small businesses?", a: "Yes, we specialize in small business accounting — bookkeeping, payroll, tax planning, and more. What does your business need?" },
      { q: "What's the deadline?", a: "Tax filing deadlines vary. I can have our team confirm the relevant dates for your situation. Would you like to schedule a consultation?" },
    ],
    services: ["Tax Preparation", "Bookkeeping", "Payroll", "Tax Planning", "Business Advisory", "IRS Resolution", "Audit Support", "Entity Formation"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 120, template: "Hi {name}, we missed your call at {business_name}. Need tax help or accounting services? Reply or call back!" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Tax Season Reminder",
      type: "reactivation",
      description: "Annual tax season outreach",
      targetFilter: { days_not_contacted: 300, statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, tax season is approaching! {business_name} is ready to help. Schedule your prep: {booking_link}" },
        { channel: "call", delay: 604800, template: "Hi {name}, {business_name} here. Tax season is coming up — have you started your prep? We'd love to help." },
      ],
    },
    {
      name: "Engagement Follow-Up",
      type: "quote_chase",
      description: "Follow up on proposals",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 3 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, following up on our proposal from {business_name}. Any questions?" },
      ],
    },
  ],
};
