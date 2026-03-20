import type { IndustryPack } from "./types";

export const cleaningPack: IndustryPack = {
  id: "cleaning",
  name: "Cleaning Service",
  icon: "Sparkle",
  greeting: "Welcome to {business_name}, let's make your space shine!",
  avgJobValue: 180,
  appointmentTypes: [
    { name: "Deep Clean", duration: 180 },
    { name: "Regular Clean", duration: 120 },
    { name: "Move-In/Out", duration: 240 },
    { name: "Office Cleaning", duration: 150 },
    { name: "Carpet Cleaning", duration: 90 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Are your team members insured and bonded?", a: "Yes! Every team member at {business_name} is fully insured and bonded. Your home and valuables are completely protected during service." },
      { q: "What are your business hours?", a: "We're available {business_hours}. {business_name} offers flexible scheduling with morning, afternoon, or evening appointments to match your needs." },
      { q: "What products and methods do you use?", a: "We use eco-friendly, non-toxic cleaning products that are safe for families and pets. Let us know about any allergies or sensitivities!" },
      { q: "Do you offer regular cleaning services?", a: "Absolutely! {business_name} offers weekly, bi-weekly, and monthly recurring cleaning with special discounts for regular customers." },
      { q: "What's your satisfaction guarantee?", a: "Your happiness is guaranteed! If you're not completely satisfied, just let {business_name} know within 24 hours and we'll re-clean at no extra charge." },
    ],
    services: [
      "Deep clean",
      "Regular clean",
      "Move-in/out",
      "Office cleaning",
      "Carpet cleaning",
      "Window cleaning",
      "Post-construction",
      "Organizing",
      "Pressure washing",
      "Recurring service",
    ],
  },
  inboundWorkflows: [
    {
      name: "Missed Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Ready for a spotless home? Reply YES to schedule or call us back!" },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, just following up from {business_name}. We have availability this week for your cleaning! {available_times}" },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We'd love to help make your home or office sparkling clean. Can we schedule a cleaning?" },
      ],
    },
    {
      name: "Cleaning Appointment Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: We're coming to clean your space tomorrow at {appointment_time}. Please secure any valuables!" },
        { channel: "sms", delay: -3600, template: "Our cleaning team will be at your place in 1 hour. Please ensure someone is available!" },
      ],
    },
    {
      name: "Missed Appointment Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we were scheduled to clean your space at {business_name} today. Would you like to reschedule?" },
        { channel: "call", delay: 14400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We showed up for your cleaning today and wanted to reschedule. When works better for you?" },
        { channel: "sms", delay: 86400, condition: "if_no_reply", template: "Hi {name}, let's get your space cleaned! Reschedule at {business_name}: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Recurring Cleaning Reactivation",
      type: "reactivation",
      description: "Re-engage one-time customers to set up recurring cleaning service",
      targetFilter: { days_not_contacted: 90, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, it's time for another cleaning! Start recurring service at {business_name} and save 10%: {booking_link}" },
        { channel: "call", delay: 259200, template: "Hi {name}, this is {business_name}. Would you like to set up recurring cleaning? We offer weekly and bi-weekly options." },
        { channel: "sms", delay: 604800, template: "Keep your space fresh! {business_name} has recurring plans that fit your budget. Book now: {booking_link}" },
      ],
    },
    {
      name: "Service Quote Follow-Up",
      type: "quote_chase",
      description: "Follow up on deep clean and special service quotes",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 3 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, just following up on your {service_type} quote. Still interested in scheduling? {business_name} can fit you in soon!" },
        { channel: "sms", delay: 172800, template: "Hi {name}, the quote for your {service_type} is valid through next week. Ready to book? {booking_link}" },
        { channel: "call", delay: 432000, template: "Hi {name}, this is {business_name}. I'm calling about your {service_type} quote. Any questions before we schedule?" },
      ],
    },
    {
      name: "Post-Cleaning Review Request",
      type: "review_request",
      description: "Request reviews after cleaning services",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for choosing {business_name}, {name}! We hope your space looks amazing. Share your experience: {review_link}" },
      ],
    },
  ],
};
