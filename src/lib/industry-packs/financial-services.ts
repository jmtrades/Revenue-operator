import type { IndustryPack } from "./types";

export const financialServicesPack: IndustryPack = {
  id: "financial_services",
  name: "Financial Services",
  icon: "DollarSign",
  greeting: "Thank you for calling {business_name}, how can we help with your financial needs today?",
  avgJobValue: 5000,
  appointmentTypes: [
    { name: "Tax Consultation", duration: 60 },
    { name: "Financial Planning Session", duration: 90 },
    { name: "Business Setup", duration: 120 },
    { name: "Bookkeeping Review", duration: 60 },
    { name: "Investment Review", duration: 75 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Do you offer tax preparation services?", a: "Yes! {business_name} provides comprehensive tax prep for individuals and businesses. We work to maximize deductions and minimize your tax liability." },
      { q: "What are your hours?", a: "We're available {business_hours}. Tax season hours may vary. Call ahead or schedule a consultation online at {booking_link}." },
      { q: "How much does tax preparation cost?", a: "Our fees depend on your situation. Simple returns start around $300; we provide detailed quotes after an initial consultation." },
      { q: "Do you handle small business accounting?", a: "Absolutely! {business_name} specializes in bookkeeping and accounting services for small businesses. We handle payroll, tax planning, and financial statements." },
      { q: "Can you help with retirement planning?", a: "Yes, we offer comprehensive retirement planning services to help you achieve your long-term financial goals. Let's schedule a planning session." },
    ],
    services: ["Tax prep", "Bookkeeping", "Financial planning", "Investment advice", "Retirement planning", "Estate planning", "Payroll", "Business formation", "Audit support"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Need financial advice? Reply YES or call us back at {business_phone}." },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, following up from {business_name}. Our financial experts are ready to help with taxes, planning, or business accounting." },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name} checking in on your call. We'd like to discuss how we can help optimize your financial situation." },
      ],
    },
    {
      name: "Consultation Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: You have a {appointment_type} with {business_name} tomorrow at {appointment_time}. Reply C to confirm or R to reschedule." },
        { channel: "email", delay: -3600, template: "Your {appointment_type} is in 1 hour at {appointment_time}. Please have relevant documents ready. See you soon!" },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we missed you for your appointment at {business_name} today. Would you like to reschedule?" },
        { channel: "call", delay: 14400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We had you scheduled today and want to make sure everything is okay. Can we reschedule?" },
        { channel: "email", delay: 86400, condition: "if_no_reply", template: "Hi {name}, let's get you back on track with your financial planning. Schedule at your convenience: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Tax Season Preparation Campaign",
      type: "reactivation",
      description: "Re-engage previous clients before tax season",
      targetFilter: { days_not_contacted: 365, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Tax season is here! {business_name} can handle your tax prep and help you save. Schedule now: {booking_link}" },
        { channel: "email", delay: 259200, template: "Hi {name}, it's time to get your taxes done right. Our team at {business_name} is ready to help. Book your consultation: {booking_link}" },
        { channel: "call", delay: 604800, template: "Hi {name}, this is {business_name}. Don't wait until the last minute on taxes. We'd love to help you prepare. Can we schedule?" },
      ],
    },
    {
      name: "Financial Plan Quote Follow-Up",
      type: "quote_chase",
      description: "Follow up on financial planning proposals",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 3 },
      sequence: [
        { channel: "email", delay: 0, template: "Hi {name}, thanks for reviewing the {service_type} proposal from {business_name}. Questions? We're here to clarify anything." },
        { channel: "sms", delay: 172800, template: "Hi {name}, ready to move forward with your {service_type}? Let's get started: {booking_link}" },
        { channel: "call", delay: 432000, template: "Hi {name}, this is {business_name}. I wanted to follow up on your financial planning proposal. Can we discuss it?" },
      ],
    },
    {
      name: "Client Testimonial Request",
      type: "review_request",
      description: "Request reviews and testimonials from satisfied clients",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "email", delay: 7200, template: "Thanks for working with {business_name}, {name}! Your financial feedback helps others. Share your experience: {review_link}" },
      ],
    },
  ],
};
