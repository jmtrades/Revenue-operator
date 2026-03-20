import type { IndustryPack } from "./types";

export const electricalPack: IndustryPack = {
  id: "electrical",
  name: "Electrical Services",
  icon: "Zap",
  greeting: "Thank you for calling {business_name}, how can we help with your electrical needs today?",
  avgJobValue: 1200,
  appointmentTypes: [
    { name: "Emergency Service", duration: 60 },
    { name: "Inspection", duration: 45 },
    { name: "Repair", duration: 90 },
    { name: "Installation", duration: 120 },
    { name: "Upgrade", duration: 180 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Do you provide emergency electrical services?", a: "Yes, we offer 24/7 emergency electrical services. Our licensed electricians can respond quickly to outages and safety issues. What's the emergency?" },
      { q: "What are your hours?", a: "Our regular hours are {business_hours}. We also provide emergency services around the clock for critical electrical issues." },
      { q: "How much does an electrical inspection cost?", a: "A basic electrical inspection typically runs $200-300. We'll identify any code violations or safety concerns and provide a detailed report." },
      { q: "Are you licensed and insured?", a: "Absolutely! All our electricians are fully licensed, insured, and trained to the latest safety codes. We stand behind all our work." },
      { q: "Can you help with smart home installation?", a: "Yes! {business_name} specializes in smart home electrical work including smart lighting, outlets, thermostats, and more. Would you like a consultation?" },
    ],
    services: ["Panel upgrade", "Wiring", "Outlet install", "Lighting", "Generator", "EV charger", "Ceiling fan", "Surge protector", "Code violation fix", "Smart home"],
  },
  inboundWorkflows: [
    {
      name: "Missed Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Got an electrical issue? Reply YES for a quick callback at {business_phone}." },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, following up from {business_name}. We have licensed electricians available today. Let us know how we can help!" },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name} checking in on your call. We'd like to help with your electrical needs. Is this still a good time?" },
      ],
    },
    {
      name: "Service Appointment Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: You have {appointment_type} scheduled at {business_name} tomorrow at {appointment_time}. Reply C to confirm or R to reschedule." },
        { channel: "sms", delay: -3600, template: "Your electrical service is in 1 hour at {appointment_time}. Our technician is on the way!" },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we missed you for your {appointment_type} at {business_name} today. Would you like to reschedule?" },
        { channel: "call", delay: 14400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We noticed you couldn't make your electrical service appointment. We still have availability this week." },
        { channel: "sms", delay: 86400, condition: "if_no_reply", template: "No problem, {name}! Let's get you scheduled: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Electrical Safety Inspection Reactivation",
      type: "reactivation",
      description: "Encourage customers to schedule safety inspections",
      targetFilter: { days_not_contacted: 365, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, it's been a while since {business_name} last served you. Schedule a free electrical safety inspection: {booking_link}" },
        { channel: "call", delay: 259200, template: "Hi {name}, this is {business_name}. We'd like to ensure your home's electrical system is up to code. Can we schedule an inspection?" },
        { channel: "sms", delay: 604800, template: "Last chance, {name}! Electrical safety matters. {business_name} offers competitive inspection rates. Book here: {booking_link}" },
      ],
    },
    {
      name: "Quote Follow-Up",
      type: "quote_chase",
      description: "Follow up on electrical quotes that haven't been accepted",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 3 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, just following up on your {service_type} estimate from {business_name}. Any questions? We're here to help!" },
        { channel: "sms", delay: 172800, template: "Hi {name}, we want to make sure you have all the info on your {service_type}. Ready to schedule? {booking_link}" },
        { channel: "call", delay: 432000, template: "Hi {name}, this is {business_name}. I'm calling about the electrical quote we put together. Can we discuss it briefly?" },
      ],
    },
    {
      name: "Post-Service Review Request",
      type: "review_request",
      description: "Request Google review after electrical work completion",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for choosing {business_name}, {name}! We'd love a review of your electrical service experience: {review_link}" },
      ],
    },
  ],
};
