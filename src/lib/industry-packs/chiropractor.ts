import type { IndustryPack } from "./types";

export const chiropractorPack: IndustryPack = {
  id: "chiropractor",
  name: "Chiropractic Practice",
  icon: "Activity",
  greeting: "Welcome to {business_name}, let's get your spine aligned and your body feeling great!",
  avgJobValue: 150,
  appointmentTypes: [
    { name: "Consultation", duration: 30 },
    { name: "Adjustment", duration: 25 },
    { name: "X-ray", duration: 15 },
    { name: "Spinal Decompression", duration: 45 },
    { name: "Massage Therapy", duration: 40 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Is chiropractic care covered by insurance?", a: "Many insurance plans do cover chiropractic care! We'll help verify your coverage when you book your first appointment. {business_name} works with most major insurers." },
      { q: "What are your business hours?", a: "We're open {business_hours}. We offer flexible scheduling to fit your busy lifestyle. Same-day appointments are often available!" },
      { q: "Will adjustments hurt?", a: "No! Chiropractic adjustments at {business_name} are performed by licensed professionals using gentle, evidence-based techniques. Most patients feel relief immediately after." },
      { q: "How long does a treatment course usually take?", a: "Most patients see significant improvement within 2-4 weeks of consistent adjustments. We'll create a personalized treatment plan at your consultation and adjust as needed." },
      { q: "Can you help with sports injuries?", a: "Absolutely! {business_name} specializes in sports rehab and injury recovery. We work with athletes of all levels to get them back in action safely." },
    ],
    services: [
      "Adjustment",
      "Consultation",
      "X-ray",
      "Spinal decompression",
      "Massage therapy",
      "Posture analysis",
      "Sports rehab",
      "Wellness plan",
      "Auto injury",
      "Worker's comp",
    ],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Back pain? We can help! Reply YES to book your adjustment or call us at {business_phone}." },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, just following up from {business_name}. We have openings this week for your consultation and adjustment. {available_times}" },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We wanted to help with your chiropractic needs. Can we get you scheduled for an adjustment soon?" },
      ],
    },
    {
      name: "Appointment Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -3600, template: "Reminder: You have a {appointment_type} appointment at {business_name} in 1 hour at {appointment_time}. We're ready to help you feel better!" },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we were expecting you for your {appointment_type} at {business_name} today. Would you like to reschedule?" },
        { channel: "sms", delay: 86400, condition: "if_no_reply", template: "Hi {name}, no problem! Let's get you rescheduled for your chiropractic care. Book now: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Wellness Reactivation",
      type: "reactivation",
      description: "Re-engage patients who haven't visited in 90+ days for ongoing wellness",
      targetFilter: { days_not_contacted: 90, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, your spine will thank you! Time for your wellness check at {business_name}. Book your adjustment: {booking_link}" },
        { channel: "call", delay: 259200, template: "Hi {name}, this is {business_name}. It's been a while! Ready to feel great again? Let's schedule your appointment." },
        { channel: "sms", delay: 604800, template: "Don't ignore those aches! {business_name} is here to keep you feeling your best. Schedule your visit: {booking_link}" },
      ],
    },
    {
      name: "Treatment Plan Acceptance",
      type: "quote_chase",
      description: "Follow up on treatment plans that haven't been confirmed",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 3 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, just checking on the {service_type} plan we discussed at {business_name}. Ready to start?" },
        { channel: "sms", delay: 172800, template: "Hi {name}, your customized {service_type} treatment plan is waiting. Let's get you feeling better soon!" },
        { channel: "call", delay: 432000, template: "Hi {name}, this is {business_name}. Calling about your treatment plan. Are you ready to begin your recovery?" },
      ],
    },
    {
      name: "Care Review Request",
      type: "review_request",
      description: "Request reviews after chiropractic appointments",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for trusting {business_name} with your care, {name}! Feeling better? We'd love a review: {review_link}" },
      ],
    },
  ],
};
