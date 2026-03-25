import type { IndustryPack } from "./types";

export const plumbingPack: IndustryPack = {
  id: "plumbing",
  name: "Plumbing Company",
  icon: "Wrench",
  greeting: "Thank you for calling {business_name}, how can I help you with your plumbing needs today?",
  avgJobValue: 850,
  appointmentTypes: [
    { name: "Emergency Service", duration: 60 },
    { name: "Inspection", duration: 45 },
    { name: "Repair", duration: 90 },
    { name: "Installation", duration: 120 },
    { name: "Maintenance", duration: 60 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Do you offer emergency plumbing services?", a: "Yes, we provide 24/7 emergency plumbing services. We can typically arrive within 1-2 hours for urgent issues. What's the problem you're experiencing?" },
      { q: "What are your business hours?", a: "We're available {business_hours}, and we also offer emergency services outside these hours. How can we help?" },
      { q: "How much does a service call cost?", a: "Our service calls start at $150, which includes the inspection. Any repairs or installations would be quoted based on the specific work needed." },
      { q: "Do you handle both residential and commercial work?", a: "Absolutely! {business_name} services both residential and commercial clients. Would you like to schedule a service call?" },
      { q: "Are you licensed and insured?", a: "Yes, we're fully licensed and insured. All our plumbers are certified professionals with years of experience. Would you like to book an appointment?" },
    ],
    services: ["Leak repair", "Pipe replacement", "Drain cleaning", "Water heater", "Sewer line", "Faucet install", "Toilet repair", "Gas line", "Sump pump", "Garbage disposal"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Got a plumbing issue? Reply YES for a quick callback or call us at {business_phone}." },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, following up from {business_name}. We have availability today for emergency plumbing services. Call us back to schedule." },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name} checking in on your earlier call. We'd like to help with your plumbing problem. Do you still need service?" },
      ],
    },
    {
      name: "Service Appointment Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: You have a {appointment_type} scheduled at {business_name} tomorrow at {appointment_time}. Reply C to confirm or R to reschedule." },
        { channel: "sms", delay: -3600, template: "Your plumbing service is scheduled in 1 hour at {appointment_time}. Our team is on the way!" },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we missed you for your appointment at {business_name} today. Was there an issue? Would you like to reschedule?" },
        { channel: "call", delay: 14400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We noticed you didn't make your plumbing appointment. We still have availability this week. Can we reschedule?" },
        { channel: "sms", delay: 86400, condition: "if_no_reply", template: "No worries, {name}! Schedule your service at your convenience: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Seasonal Maintenance Reactivation",
      type: "reactivation",
      description: "Re-engage customers for spring/fall plumbing maintenance",
      targetFilter: { days_not_contacted: 180, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, it's time for your plumbing maintenance check! {business_name} can help prevent costly repairs. Book here: {booking_link}" },
        { channel: "call", delay: 259200, template: "Hi {name}, this is {business_name}. We haven't seen you in a while and want to make sure your plumbing is running smoothly. Can we schedule a maintenance visit?" },
        { channel: "sms", delay: 604800, template: "Last reminder, {name}! Don't wait for an emergency. {business_name} offers affordable maintenance plans. Schedule today: {booking_link}" },
      ],
    },
    {
      name: "Estimate Follow-Up",
      type: "quote_chase",
      description: "Follow up on quotes sent for plumbing work",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 3 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, just checking in on the plumbing estimate we sent. Do you have any questions about the {service_type}? Happy to help!" },
        { channel: "sms", delay: 172800, template: "Hi {name}, we want to make sure you have everything you need for your {service_type}. Ready to move forward? {booking_link}" },
        { channel: "call", delay: 432000, template: "Hi {name}, this is {business_name}. I wanted to follow up on your plumbing estimate. Do you have a few minutes to discuss?" },
      ],
    },
    {
      name: "Post-Service Review Request",
      type: "review_request",
      description: "Request Google review after completed plumbing work",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for choosing {business_name}, {name}! We'd appreciate a quick review of your experience: {review_link}" },
      ],
    },
  ],
};
