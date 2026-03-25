import type { IndustryPack } from "./types";

export const pharmacyPack: IndustryPack = {
  id: "pharmacy",
  name: "Pharmacy",
  icon: "Pill",
  greeting: "Welcome to {business_name}, how can I help you with your medications today?",
  avgJobValue: 45,
  appointmentTypes: [
    { name: "Prescription Refill", duration: 10 },
    { name: "Immunization", duration: 15 },
    { name: "Med Sync Consultation", duration: 20 },
    { name: "Medication Review", duration: 25 },
    { name: "Health Screening", duration: 30 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Can you transfer my prescription from another pharmacy?", a: "Yes! {business_name} can quickly transfer your prescriptions from any other pharmacy. Just give us the name and we'll handle everything for you." },
      { q: "What are your hours?", a: "We're open {business_hours}. We also offer online refill requests and convenient home delivery for your medications." },
      { q: "Do you offer vaccinations and immunizations?", a: "Yes! {business_name} provides flu shots, COVID vaccines, shingles, pneumonia, and other immunizations. Walk-ins are always welcome—no appointment needed!" },
      { q: "What's medication synchronization?", a: "Med sync aligns all your prescription refill dates so you pick everything up on the same day each month. Our team at {business_name} can set this up in minutes!" },
      { q: "Can you help me understand my medications?", a: "Absolutely! {business_name} offers free medication consultations with our licensed pharmacists. We ensure your medications work safely together and answer all your questions." },
    ],
    services: [
      "Prescription fill",
      "Refill",
      "Transfer",
      "Immunizations",
      "Blood pressure check",
      "Consultation",
      "Compound",
      "OTC advice",
      "Health screening",
      "Home delivery",
    ],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Need a prescription refill? Reply YES or call us back at {business_phone}." },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, just following up from {business_name}. We can refill your prescriptions and have them ready today!" },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We wanted to make sure we could help with your prescription needs. How can we assist you?" },
      ],
    },
    {
      name: "Appointment Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -3600, template: "Reminder: You have a {appointment_type} appointment at {business_name} in 1 hour at {appointment_time}. We're ready for you!" },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we were expecting you for your {appointment_type} at {business_name} today. Would you like to reschedule?" },
        { channel: "sms", delay: 86400, condition: "if_no_reply", template: "Hi {name}, no worries! Here's a link to reschedule your appointment at {business_name}: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Prescription Reactivation",
      type: "reactivation",
      description: "Re-engage customers who haven't filled prescriptions in 60+ days",
      targetFilter: { days_not_contacted: 60, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, it's time to refill your medications! {business_name} makes it easy. Order online or call: {booking_link}" },
        { channel: "call", delay: 259200, template: "Hi {name}, this is {business_name}. We noticed you're due for a refill. Can I help get your prescription ready?" },
        { channel: "sms", delay: 604800, template: "Don't run out! {business_name} can refill your medications today. We offer delivery too! {booking_link}" },
      ],
    },
    {
      name: "Immunization Reminder",
      type: "quote_chase",
      description: "Follow up on recommended immunizations not yet scheduled",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 5 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, just following up about the {service_type} vaccine we discussed. Still interested in scheduling?" },
        { channel: "sms", delay: 172800, template: "Hi {name}, your {service_type} is available at {business_name}. No appointment needed—just walk in!" },
        { channel: "call", delay: 432000, template: "Hi {name}, this is {business_name}. I'm calling to help you schedule your {service_type} immunization. When works for you?" },
      ],
    },
    {
      name: "Service Review Request",
      type: "review_request",
      description: "Request reviews after medication services",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for choosing {business_name}, {name}! If we provided great service, we'd appreciate a review: {review_link}" },
      ],
    },
  ],
};
