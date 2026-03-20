import type { IndustryPack } from "./types";

export const beautySalonPack: IndustryPack = {
  id: "beauty_salon",
  name: "Beauty Salon & Spa",
  icon: "Sparkles",
  greeting: "Thank you for calling {business_name}, how can we pamper you today?",
  avgJobValue: 120,
  appointmentTypes: [
    { name: "Haircut", duration: 45 },
    { name: "Hair Color", duration: 120 },
    { name: "Facial", duration: 60 },
    { name: "Massage", duration: 90 },
    { name: "Nail Service", duration: 45 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "What services do you offer?", a: "{business_name} offers hair services, facials, massages, manicures, pedicures, and more. We have experienced stylists and therapists to pamper you." },
      { q: "What are your hours?", a: "We're open {business_hours}. We recommend booking in advance, especially on weekends. Schedule your appointment here: {booking_link}" },
      { q: "Do you accept walk-ins?", a: "We love walk-ins, but appointments get priority. We do our best to fit you in, but for guaranteed availability, please book ahead." },
      { q: "Are you using safe and clean products?", a: "Absolutely! {business_name} uses high-quality, sanitized tools and premium products. Your health and safety are our top priority." },
      { q: "Do you offer gift certificates?", a: "Yes! Gift certificates are perfect for any occasion. You can purchase them in-person, online, or by phone. {booking_link}" },
    ],
    services: ["Haircut", "Color", "Highlights", "Blowout", "Facial", "Manicure", "Pedicure", "Waxing", "Massage", "Brow shaping", "Lash extensions"],
  },
  inboundWorkflows: [
    {
      name: "Missed Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Ready to get pampered? Reply YES or call us at {business_phone}." },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, following up from {business_name}. We have availability this week for your favorite services!" },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name} checking in. We'd love to get you scheduled for your next appointment. Are you available this week?" },
      ],
    },
    {
      name: "Appointment Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: You have a {appointment_type} at {business_name} tomorrow at {appointment_time}. Reply C to confirm or R to reschedule." },
        { channel: "sms", delay: -3600, template: "See you in 1 hour at {business_name} for your {appointment_type} at {appointment_time}! We're excited to see you!" },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we missed you at {business_name} today for your {appointment_type}. Would you like to reschedule?" },
        { channel: "call", delay: 14400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We had you down for an appointment today. Is everything okay? We'd love to get you rescheduled." },
        { channel: "sms", delay: 86400, condition: "if_no_reply", template: "No worries, {name}! Reschedule your appointment anytime: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Seasonal Beauty Services Reactivation",
      type: "reactivation",
      description: "Re-engage customers for seasonal beauty services",
      targetFilter: { days_not_contacted: 120, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Refresh your look! {business_name} has seasonal specials on color, styling, and spa services. Book now: {booking_link}" },
        { channel: "call", delay: 259200, template: "Hi {name}, this is {business_name}. It's been a while since we've seen you! We'd love to refresh your hair and nails. Can we schedule?" },
        { channel: "sms", delay: 604800, template: "Last reminder, {name}! Get the pampering you deserve at {business_name}. Special pricing available: {booking_link}" },
      ],
    },
    {
      name: "Service Upsell Follow-Up",
      type: "quote_chase",
      description: "Follow up on beauty service quotes and consultations",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 2 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, thanks for considering our {service_type}! Ready to book? {booking_link}" },
        { channel: "sms", delay: 86400, template: "Hi {name}, our stylists are excited to do your {service_type}. Let's get you scheduled: {booking_link}" },
        { channel: "call", delay: 172800, template: "Hi {name}, this is {business_name}. Following up on the {service_type} consultation. Ready to book your appointment?" },
      ],
    },
    {
      name: "Post-Visit Review & Loyalty",
      type: "review_request",
      description: "Request reviews and encourage loyalty program enrollment",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for choosing {business_name}, {name}! Love your new look? Share your experience: {review_link}" },
      ],
    },
  ],
};
