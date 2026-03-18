import type { IndustryPack } from "./types";

export const legalPack: IndustryPack = {
  id: "legal",
  name: "Legal",
  icon: "Scale",
  greeting: "Thank you for calling {business_name}. How can we help you today?",
  avgJobValue: 8000,
  appointmentTypes: [
    { name: "Consultation", duration: 60 },
    { name: "Case review", duration: 45 },
    { name: "Intake", duration: 30 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Do you offer free consultations?", a: "I can check availability for a consultation with our team. May I get your name and a brief summary?" },
    ],
    services: ["Personal injury", "Family law", "Immigration", "Consultation", "Case review"],
  },
  inboundWorkflows: [
    {
      name: "Missed Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call to {business_name}. This matter may be time-sensitive — reply or call back." },
        { channel: "call", delay: 3600, condition: "if_no_reply", script: "Hi {name}, this is {business_name} following up on your call. Do you have a few minutes now?" },
      ],
    },
    {
      name: "Intake Follow-Up",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: 0, template: "Your consultation with {business_name} is confirmed for {appointment_time}. We'll see you then." },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "We missed you at your scheduled time with {business_name}. Would you like to reschedule?" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Lead Intake Follow-Up",
      type: "reactivation",
      description: "Follow up new intakes",
      targetFilter: { statuses: ["new"], days_not_contacted: 0 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, {business_name} here. We received your inquiry — can we schedule a brief call?" },
      ],
    },
  ],
};
