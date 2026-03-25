import type { IndustryPack } from "./types";

export const generalPack: IndustryPack = {
  id: "general",
  name: "General Business",
  icon: "Building2",
  greeting: "Thank you for calling {business_name}. How can I help you today?",
  avgJobValue: 500,
  appointmentTypes: [
    { name: "Appointment", duration: 60 },
    { name: "Consultation", duration: 30 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "What are your hours?", a: "Our hours are {business_hours}. Would you like to schedule a time?" },
    ],
    services: ["General service", "Consultation", "Support"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call to {business_name}. How can we help? Reply or call back." },
      ],
    },
    {
      name: "Appointment Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: You have an appointment at {business_name} tomorrow at {appointment_time}." },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 3600, template: "We missed you at {business_name}. Reschedule: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Reactivation",
      type: "reactivation",
      description: "Re-engage inactive contacts",
      targetFilter: { days_not_contacted: 90 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, it's been a while — {business_name} would love to help again. {booking_link}" },
      ],
    },
  ],
};
