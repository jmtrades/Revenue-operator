import type { IndustryPack } from "./types";

export const autoRepairPack: IndustryPack = {
  id: "auto_repair",
  name: "Auto Repair & Service",
  icon: "Car",
  greeting: "Thanks for calling {business_name}. Are you calling to schedule service, get a quote, or have your vehicle looked at?",
  avgJobValue: 650,
  appointmentTypes: [
    { name: "Oil Change", duration: 30 },
    { name: "Brake Service", duration: 90 },
    { name: "Diagnostic", duration: 60 },
    { name: "Tire Service", duration: 45 },
    { name: "Major Repair", duration: 240 },
    { name: "Inspection", duration: 30 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "How much does an oil change cost?", a: "Oil change pricing depends on your vehicle and oil type. I can get you a quote — what year, make, and model do you drive?" },
      { q: "Do you work on my car brand?", a: "We work on most makes and models. What do you drive? I'll confirm we can help." },
      { q: "Can I get a loaner car?", a: "Let me check loaner availability for you. When were you thinking of bringing your car in?" },
      { q: "How long will the repair take?", a: "Repair times vary by service. I can give you an estimate once I know what you need done. What's going on with your vehicle?" },
      { q: "Do you offer a warranty on repairs?", a: "Yes, we stand behind our work. Our warranty details depend on the specific service. Would you like to bring your car in for an assessment?" },
    ],
    services: ["Oil Change", "Brake Service", "Tire Rotation", "Transmission", "Engine Repair", "Diagnostic", "AC Repair", "Alignment", "Battery", "State Inspection"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 120, template: "Hi {name}, we missed your call at {business_name}. Need service or a quote? Reply or call us back!" },
        { channel: "call", delay: 7200, condition: "if_no_reply", script: "Hi {name}, this is {business_name} returning your call. How can we help with your vehicle?" },
      ],
    },
    {
      name: "Service Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: Your service appointment at {business_name} is tomorrow at {appointment_time}." },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Maintenance Reminder",
      type: "reactivation",
      description: "Remind customers about regular maintenance",
      targetFilter: { days_not_contacted: 90, statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, it's been a while since your last service at {business_name}. Time for a checkup? Book: {booking_link}" },
      ],
    },
    {
      name: "Estimate Follow-Up",
      type: "quote_chase",
      description: "Follow up on repair estimates",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 2 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, following up on your estimate from {business_name}. Ready to schedule the repair?" },
        { channel: "call", delay: 172800, template: "Hi {name}, {business_name} calling about your repair estimate. Any questions?" },
      ],
    },
  ],
};
