import type { IndustryPack } from "./types";

export const healthcarePack: IndustryPack = {
  id: "healthcare",
  name: "Healthcare & Medical",
  icon: "Stethoscope",
  greeting: "Thanks for calling {business_name}. Are you calling to schedule an appointment, refill a prescription, or have a question?",
  avgJobValue: 250,
  appointmentTypes: [
    { name: "New Patient Visit", duration: 60 },
    { name: "Follow-Up", duration: 30 },
    { name: "Annual Physical", duration: 45 },
    { name: "Sick Visit", duration: 20 },
    { name: "Telehealth", duration: 20 },
    { name: "Lab Work", duration: 15 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Are you accepting new patients?", a: "Yes, we'd be happy to welcome you! Would you like to schedule your first visit?" },
      { q: "Do you accept my insurance?", a: "We accept most major insurance plans. Can I get your insurance info to verify your coverage before scheduling?" },
      { q: "I need a prescription refill", a: "I can have the office process that for you. Can I get your name and date of birth so I can pull up your chart?" },
      { q: "Do you offer telehealth?", a: "Yes, we offer virtual visits for many types of appointments. Would you like to schedule a telehealth visit?" },
      { q: "I'm feeling sick and need to be seen today", a: "I'm sorry you're not feeling well. Let me check our earliest available slot for a same-day sick visit." },
      { q: "How do I get my test results?", a: "Test results are typically available through your patient portal, or I can have the office call you. Would you like me to leave a message for the clinical team?" },
    ],
    services: ["Primary Care", "Annual Physical", "Sick Visits", "Telehealth", "Lab Work", "Immunizations", "Referrals", "Prescription Refills"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Need to schedule or have a question? Reply or call us back!" },
      ],
    },
    {
      name: "Appointment Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: Your appointment at {business_name} is tomorrow at {appointment_time}. Reply C to confirm or R to reschedule." },
        { channel: "sms", delay: -3600, template: "Your appointment at {business_name} is in 1 hour. See you soon!" },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 3600, template: "Hi {name}, we missed you at your appointment today at {business_name}. Would you like to reschedule?" },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We noticed you couldn't make your appointment. Would you like to reschedule?" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Annual Checkup Reminder",
      type: "reactivation",
      description: "Remind patients about their annual checkup",
      targetFilter: { days_not_contacted: 330, statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, it's time for your annual checkup at {business_name}. Schedule online: {booking_link}" },
        { channel: "call", delay: 604800, template: "Hi {name}, this is {business_name} reminding you it's time for your annual visit. Can I book you in?" },
      ],
    },
    {
      name: "Post-Visit Review",
      type: "review_request",
      description: "Ask for feedback after visit",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 86400, template: "Thanks for your visit to {business_name}, {name}. How was your experience? We'd love your feedback: {review_link}" },
      ],
    },
  ],
};
