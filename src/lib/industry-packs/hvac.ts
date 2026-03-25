import type { IndustryPack } from "./types";

export const hvacPack: IndustryPack = {
  id: "hvac",
  name: "HVAC & Plumbing",
  icon: "Wrench",
  greeting: "Thanks for calling {business_name}. Are you calling for service, a quote, or an emergency?",
  avgJobValue: 450,
  appointmentTypes: [
    { name: "Repair", duration: 90 },
    { name: "Maintenance", duration: 60 },
    { name: "Install", duration: 240 },
    { name: "Emergency", duration: 120 },
    { name: "Inspection", duration: 45 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Do you offer emergency service?", a: "Yes. Tell me what's going on and I'll get you on the schedule or dispatch someone if it's urgent." },
      { q: "What are your rates?", a: "Rates depend on the job type. I can book a technician to assess and give you a clear estimate on site." },
    ],
    services: ["Repair", "Maintenance", "Installation", "Emergency", "Inspection", "Duct cleaning"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 120, template: "Hi {name}, we missed your call to {business_name}. Need service or a quote? Reply or call us back." },
        { channel: "call", delay: 7200, condition: "if_no_reply", script: "Hi, this is {business_name} returning your call. How can we help with your HVAC or plumbing needs?" },
      ],
    },
    {
      name: "Appointment Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: {business_name} is scheduled for tomorrow at {appointment_time}. Reply R to reschedule." },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "We missed you at your appointment with {business_name}. Want to reschedule? Reply YES." },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Quote Follow-Up",
      type: "quote_chase",
      description: "Chase open estimates",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 2 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, following up on your estimate from {business_name}. Ready to move forward?" },
        { channel: "call", delay: 172800, template: "Hi {name}, {business_name} here about your quote. Got a minute?" },
      ],
    },
    {
      name: "Seasonal Tune-Up",
      type: "reactivation",
      description: "Re-engage for maintenance season",
      targetFilter: { days_not_contacted: 365, statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, time for your seasonal tune-up at {business_name}. Book: {booking_link}" },
      ],
    },
  ],
};
