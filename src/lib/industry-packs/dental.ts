import type { IndustryPack } from "./types";

export const dentalPack: IndustryPack = {
  id: "dental",
  name: "Dental Practice",
  icon: "Heart",
  greeting: "Thank you for calling {business_name}, how can I help you today?",
  avgJobValue: 3200,
  appointmentTypes: [
    { name: "Cleaning", duration: 60 },
    { name: "Exam", duration: 30 },
    { name: "Crown", duration: 90 },
    { name: "Emergency", duration: 45 },
    { name: "Consultation", duration: 30 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Do you accept insurance?", a: "We accept most major dental insurance plans. Can I get your insurance information to verify your coverage?" },
      { q: "What are your hours?", a: "Our office hours are {business_hours}. Would you like to schedule an appointment?" },
      { q: "Do you accept new patients?", a: "Absolutely! We'd love to welcome you. Would you like to schedule your first visit?" },
      { q: "How much does a cleaning cost?", a: "Cleaning costs depend on your insurance coverage. I can help schedule you and our office will verify your benefits beforehand." },
      { q: "I have a dental emergency", a: "I'm sorry to hear that. Let me check our earliest available emergency appointment for you right away." },
    ],
    services: ["Cleaning", "Exam", "X-ray", "Crown", "Root canal", "Extraction", "Whitening", "Invisalign", "Implant", "Emergency"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Would you like to schedule an appointment? Reply YES or call us back at {business_phone}." },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, just following up from {business_name}. We have appointments available this week. Would any of these work? {available_times}" },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name} following up on your call yesterday. We wanted to make sure we could help you with your dental needs. Do you have a moment to schedule?" },
      ],
    },
    {
      name: "Appointment Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: You have a {appointment_type} appointment at {business_name} tomorrow at {appointment_time}. Reply C to confirm or R to reschedule." },
        { channel: "sms", delay: -3600, template: "Your appointment at {business_name} is in 1 hour at {appointment_time}. See you soon!" },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we missed you at your appointment today at {business_name}. Would you like to reschedule? We have openings this week." },
        { channel: "call", delay: 14400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We noticed you couldn't make it to your appointment today. We'd love to get you rescheduled. Do you have a moment to pick a new time?" },
        { channel: "sms", delay: 86400, condition: "if_no_reply", template: "Hi {name}, just one more follow-up from {business_name}. Here's a link to self-schedule at your convenience: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "6-Month Reactivation",
      type: "reactivation",
      description: "Re-engage patients who haven't visited in 6+ months for their cleaning",
      targetFilter: { days_not_contacted: 180, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, it's been a while since your last visit to {business_name}. It's time for your 6-month cleaning! Book here: {booking_link}" },
        { channel: "call", delay: 259200, template: "Hi {name}, this is {business_name} calling to remind you it's time for your dental cleaning. We have openings this week. Can I book you in?" },
        { channel: "sms", delay: 604800, template: "Last reminder, {name} — your dental health matters. {business_name} has availability this week. Schedule your cleaning: {booking_link}" },
      ],
    },
    {
      name: "Quote Follow-Up",
      type: "quote_chase",
      description: "Follow up on treatment plans that haven't been accepted",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 3 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, just following up on the treatment plan we discussed. Any questions about the {service_type}? We're happy to help." },
        { channel: "sms", delay: 172800, template: "Hi {name}, we want to make sure you have all the info you need about your {service_type}. Would you like to schedule?" },
        { channel: "call", delay: 432000, template: "Hi {name}, this is {business_name}. I'm calling about the treatment plan we put together for you. Do you have a moment to discuss?" },
      ],
    },
    {
      name: "Post-Visit Review Request",
      type: "review_request",
      description: "Ask for Google review after completed appointment",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for visiting {business_name} today, {name}! If you had a great experience, we'd appreciate a quick review: {review_link}" },
      ],
    },
  ],
};
