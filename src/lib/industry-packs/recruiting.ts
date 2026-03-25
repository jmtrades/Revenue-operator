import type { IndustryPack } from "./types";

export const recruitingPack: IndustryPack = {
  id: "recruiting",
  name: "Recruiting & Staffing",
  icon: "Users",
  greeting: "Welcome to {business_name}, let's find you the perfect role!",
  avgJobValue: 8000,
  appointmentTypes: [
    { name: "Initial Consultation", duration: 30 },
    { name: "Job Matching Session", duration: 45 },
    { name: "Interview Prep", duration: 60 },
    { name: "Offer Negotiation", duration: 45 },
    { name: "Onboarding Support", duration: 30 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Do you charge candidates for placement services?", a: "Not at all! {business_name} is completely free for job seekers. We're compensated by employers, so there's zero cost to you for finding your next role." },
      { q: "What are your business hours?", a: "Our recruiting team is available {business_hours}. We offer flexible scheduling including evening and weekend appointments for working professionals." },
      { q: "How quickly can you find me a job?", a: "Most placements through {business_name} happen within 2-4 weeks. Executive searches typically take 6-12 weeks due to their specialized nature." },
      { q: "Will you help me with interview preparation?", a: "Yes! {business_name} provides free interview coaching, resume optimization, and skills assessment to help you succeed in interviews." },
      { q: "What happens if the job doesn't work out?", a: "We're committed to your success. If a placement isn't the right fit, {business_name} will work to find you a better opportunity at no extra cost." },
    ],
    services: [
      "Candidate sourcing",
      "Resume screening",
      "Interview scheduling",
      "Background check",
      "Skills assessment",
      "Temp staffing",
      "Permanent placement",
      "Executive search",
      "Contract-to-hire",
      "Onboarding support",
    ],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Let's discuss your next career move! Reply YES to schedule or call us back." },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, we have several open positions that might be perfect for you at {business_name}. Let's talk! {available_times}" },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We'd love to discuss your career goals and find you the right opportunity. Do you have a few minutes?" },
      ],
    },
    {
      name: "Consultation Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: You have a consultation with {business_name} tomorrow at {appointment_time}. Bring your resume and list of questions!" },
        { channel: "sms", delay: -3600, template: "Your career consultation starts in 1 hour at {business_name}. Let's find your next opportunity!" },
      ],
    },
    {
      name: "Opportunity No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we had a great opportunity to discuss with you today at {business_name}. Reschedule? {available_times}" },
        { channel: "call", delay: 14400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We had an interesting position to talk about. Let's reschedule to discuss your next career move." },
        { channel: "sms", delay: 86400, condition: "if_no_reply", template: "Hi {name}, ready to move forward? Schedule your career consultation at {business_name}: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Passive Candidate Reactivation",
      type: "reactivation",
      description: "Re-engage candidates who haven't updated their profile in 6+ months",
      targetFilter: { days_not_contacted: 180, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, we have exciting new opportunities at {business_name}! Let's discuss your next move: {booking_link}" },
        { channel: "call", delay: 259200, template: "Hi {name}, this is {business_name}. We've got some amazing roles in your field. Can we schedule a quick call this week?" },
        { channel: "sms", delay: 604800, template: "Your next big opportunity is waiting! {business_name} has perfect roles for you. Update your profile: {booking_link}" },
      ],
    },
    {
      name: "Placement Offer Follow-Up",
      type: "quote_chase",
      description: "Follow up on job offers that haven't been accepted",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 2 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, just checking in on the {service_type} role we discussed. Do you have any questions about the offer?" },
        { channel: "call", delay: 86400, template: "Hi {name}, this is {business_name}. I wanted to touch base about your job offer. Can we discuss your concerns?" },
        { channel: "sms", delay: 172800, template: "Hi {name}, the employer needs an answer on your {service_type} position. Ready to move forward? {booking_link}" },
      ],
    },
    {
      name: "Placement Success Review",
      type: "review_request",
      description: "Request reviews after successful placements",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 604800, template: "Congratulations on your new role, {name}! We'd love to hear about your experience with {business_name}: {review_link}" },
      ],
    },
  ],
};
