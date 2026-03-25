import type { IndustryPack } from "./types";

export const landscapingPack: IndustryPack = {
  id: "landscaping",
  name: "Landscaping",
  icon: "Leaf",
  greeting: "Welcome to {business_name}, let's create your dream outdoor space!",
  avgJobValue: 2200,
  appointmentTypes: [
    { name: "Lawn Mowing", duration: 60 },
    { name: "Hedge Trimming", duration: 90 },
    { name: "Garden Design", duration: 120 },
    { name: "Hardscaping Project", duration: 180 },
    { name: "Tree Removal", duration: 240 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Are you licensed, insured, and bonded?", a: "Yes! {business_name} is fully licensed, insured, and bonded. We carry comprehensive liability coverage to protect your property." },
      { q: "What are your hours?", a: "We're available {business_hours} for consultations and can schedule services during weekdays or weekends based on your needs." },
      { q: "Do you offer seasonal landscaping services?", a: "Absolutely! {business_name} provides spring clean-ups, seasonal cleanup, fall leaf removal, and year-round yard maintenance. Ask about seasonal packages!" },
      { q: "Can you design and build my landscaping?", a: "Yes! {business_name} offers complete garden design services and can implement custom plans. We'll show you designs before starting work." },
      { q: "What's the best lawn care schedule?", a: "Most lawns thrive with weekly mowing during growing season. {business_name} sets up recurring service tailored to your yard's specific needs." },
    ],
    services: [
      "Lawn mowing",
      "Hedge trimming",
      "Mulching",
      "Garden design",
      "Irrigation",
      "Tree removal",
      "Hardscaping",
      "Seasonal cleanup",
      "Fertilization",
      "Sod installation",
    ],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Your lawn deserves care! Reply YES to schedule or call us back." },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, just following up from {business_name}. Spring is here—schedule your lawn service! {available_times}" },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We'd love to help make your yard look amazing. Can we schedule a service?" },
      ],
    },
    {
      name: "Service Appointment Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: We're scheduled to service your lawn tomorrow at {appointment_time}. Please move any cars or obstacles!" },
        { channel: "sms", delay: -3600, template: "Our landscaping team will arrive in 1 hour to work on your yard. See you soon!" },
      ],
    },
    {
      name: "Missed Service Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we were scheduled to work on your lawn at {business_name} today. Would you like to reschedule?" },
        { channel: "call", delay: 14400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We came by to work on your yard today. Let's find a better time to get your lawn looking great." },
        { channel: "sms", delay: 86400, condition: "if_no_reply", template: "Hi {name}, let's get your yard taken care of! Reschedule at {business_name}: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Seasonal Service Reactivation",
      type: "reactivation",
      description: "Re-engage customers for seasonal lawn and landscape services",
      targetFilter: { days_not_contacted: 120, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, spring is here! {business_name} is ready for lawn care and clean-ups. Schedule now: {booking_link}" },
        { channel: "call", delay: 259200, template: "Hi {name}, this is {business_name}. Your lawn is ready for service. Let's get it looking beautiful this season!" },
        { channel: "sms", delay: 604800, template: "Don't let your yard get overgrown! {business_name} has available slots for lawn mowing and landscaping. Book today: {booking_link}" },
      ],
    },
    {
      name: "Design Project Follow-Up",
      type: "quote_chase",
      description: "Follow up on landscape design quotes and estimates",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 5 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, just following up on the {service_type} quote for your yard. Questions about the design? Let's discuss!" },
        { channel: "call", delay: 172800, template: "Hi {name}, this is {business_name}. I'm calling about your {service_type} project. Are you ready to move forward?" },
        { channel: "sms", delay: 432000, template: "Your yard transformation is waiting! {business_name} can start your {service_type} project. Book now: {booking_link}" },
      ],
    },
    {
      name: "Post-Service Review Request",
      type: "review_request",
      description: "Request reviews after landscaping and lawn services",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for choosing {business_name}, {name}! We hope your yard looks amazing. Share your review: {review_link}" },
      ],
    },
  ],
};
