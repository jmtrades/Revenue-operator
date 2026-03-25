import type { IndustryPack } from "./types";

export const medspaPack: IndustryPack = {
  id: "medspa",
  name: "Med Spa",
  icon: "Sparkles",
  greeting: "Thank you for calling {business_name}. How can we help you feel your best today?",
  avgJobValue: 4500,
  appointmentTypes: [
    { name: "Consultation", duration: 30 },
    { name: "Treatment", duration: 60 },
    { name: "Follow-up", duration: 30 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "What treatments do you offer?", a: "We offer a range of aesthetic treatments. I can help you book a consultation to discuss goals." },
    ],
    services: ["Botox", "Filler", "Facial", "Laser", "Consultation"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 180, template: "Hi {name}, we missed your call to {business_name}. Reply to book or ask a question." },
      ],
    },
    {
      name: "Appointment Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: Your appointment at {business_name} is tomorrow at {appointment_time}." },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 3600, template: "We missed you today at {business_name}. Reschedule here: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "60-Day Reactivation",
      type: "reactivation",
      description: "Re-engage lapsed clients",
      targetFilter: { days_not_contacted: 60, statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, we'd love to see you at {business_name} again. Book: {booking_link}" },
      ],
    },
    {
      name: "Review Request",
      type: "review_request",
      description: "Post-visit review",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for visiting {business_name}, {name}! Share your experience: {review_link}" },
      ],
    },
  ],
};
