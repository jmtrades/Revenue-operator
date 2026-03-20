import type { IndustryPack } from "./types";

export const educationPack: IndustryPack = {
  id: "education",
  name: "Education & Tutoring",
  icon: "GraduationCap",
  greeting: "Thank you for calling {business_name}, how can I help with your education needs today?",
  avgJobValue: 2400,
  appointmentTypes: [
    { name: "Initial Consultation", duration: 30 },
    { name: "Tutoring Session", duration: 60 },
    { name: "Test Prep", duration: 90 },
    { name: "Course Enrollment", duration: 45 },
    { name: "Progress Review", duration: 30 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "What subjects do you tutor?", a: "{business_name} offers tutoring in Math, English, Science, History, and standardized test prep. We work with students from elementary through college level." },
      { q: "What are your hours?", a: "We're available {business_hours}, and we can often arrange flexible scheduling for students. When would work best for you?" },
      { q: "How much do tutoring sessions cost?", a: "Our rates are $50-75 per hour depending on the subject and tutor experience. We offer package discounts for multiple sessions." },
      { q: "Do you offer online tutoring?", a: "Yes! {business_name} provides both in-person and online tutoring. Online sessions offer the same quality instruction with added convenience." },
      { q: "How do I enroll a student?", a: "Getting started is easy! We'll schedule an initial consultation to assess needs and match your student with the right tutor. {booking_link}" },
    ],
    services: ["Enrollment", "Tutoring sessions", "Test prep", "Course info", "Schedule", "Progress reports", "Financial aid", "Transcript request"],
  },
  inboundWorkflows: [
    {
      name: "Missed Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Looking for tutoring help? Reply YES or call us back at {business_phone}." },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, following up from {business_name}. We have experienced tutors ready to help your student succeed. Call us back!" },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name} checking in on your call. We'd like to discuss how we can help your student achieve their goals." },
      ],
    },
    {
      name: "Session Reminder & Confirmation",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: {name} has a {appointment_type} at {business_name} tomorrow at {appointment_time}. Reply C to confirm or R to reschedule." },
        { channel: "sms", delay: -3600, template: "Your tutoring session starts in 1 hour at {appointment_time}. See you soon!" },
      ],
    },
    {
      name: "Missed Session Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we missed you for your session at {business_name} today. Would you like to reschedule?" },
        { channel: "call", delay: 14400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We noticed your student didn't make their tutoring session. Is everything okay? Let's reschedule." },
        { channel: "sms", delay: 86400, condition: "if_no_reply", template: "No worries! Reschedule your session anytime: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Back-to-School Reactivation",
      type: "reactivation",
      description: "Re-engage students during back-to-school season",
      targetFilter: { days_not_contacted: 180, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "New school year, new opportunities! {business_name} tutoring can help {name} succeed. Schedule a session: {booking_link}" },
        { channel: "call", delay: 259200, template: "Hi {name}, this is {business_name}. Back-to-school season is here and we'd love to help your student prepare. Can we schedule a consultation?" },
        { channel: "sms", delay: 604800, template: "Last call, {name}! Give your student the tutoring support they need for success. {business_name} is ready: {booking_link}" },
      ],
    },
    {
      name: "Test Prep Package Follow-Up",
      type: "quote_chase",
      description: "Follow up on test prep program quotes",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 3 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, following up on the {service_type} program we discussed. Ready to get started? {booking_link}" },
        { channel: "email", delay: 172800, template: "Hi {name}, we want to make sure you have all the details about our {service_type}. Questions? We're happy to help." },
        { channel: "call", delay: 432000, template: "Hi {name}, this is {business_name}. I'm calling about the test prep program quote. Do you have a few minutes to discuss?" },
      ],
    },
    {
      name: "Student Success Testimonial Request",
      type: "review_request",
      description: "Request reviews and success stories from satisfied students",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Congratulations {name}! We're so proud of your progress at {business_name}. Share your success story: {review_link}" },
      ],
    },
  ],
};
