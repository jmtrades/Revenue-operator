import type { IndustryPack } from "./types";

export const realEstatePack: IndustryPack = {
  id: "real_estate",
  name: "Real Estate",
  icon: "Home",
  greeting: "Thanks for calling {business_name}. Are you looking to buy, sell, or have a question about a listing?",
  avgJobValue: 8500,
  appointmentTypes: [
    { name: "Showing", duration: 30 },
    { name: "Open House", duration: 120 },
    { name: "Listing Consultation", duration: 60 },
    { name: "Buyer Consultation", duration: 45 },
    { name: "Closing", duration: 90 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Is the property still available?", a: "Let me check the latest status for you. Can you tell me which property you're interested in?" },
      { q: "What's the asking price?", a: "I can pull up the details for you. Which address or listing are you asking about?" },
      { q: "Can I schedule a showing?", a: "Absolutely! What days and times work best for you? I'll check availability." },
      { q: "Do you handle rentals too?", a: "Let me check what services we offer. Can I get your contact info so someone can follow up with rental options?" },
      { q: "How long has the property been on the market?", a: "I can look that up for you. Which property are you asking about?" },
      { q: "What are the HOA fees?", a: "HOA details vary by property. Let me have an agent get you the specifics. Can I get your number?" },
    ],
    services: ["Buying", "Selling", "Listing", "Rental", "Property Management", "Investment", "Relocation", "Commercial"],
  },
  inboundWorkflows: [
    {
      name: "Missed Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 120, template: "Hi {name}, we missed your call at {business_name}. Looking to buy, sell, or have a question? Reply or call us back!" },
        { channel: "call", delay: 7200, condition: "if_no_reply", script: "Hi {name}, this is {business_name} returning your call. How can we help with your real estate needs?" },
      ],
    },
    {
      name: "Showing Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: Your showing with {business_name} is tomorrow at {appointment_time}. See you there!" },
        { channel: "sms", delay: -3600, template: "Your showing is in 1 hour. Address: {appointment_notes}. See you soon!" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Listing Follow-Up",
      type: "quote_chase",
      description: "Follow up with leads who inquired about listings",
      targetFilter: { statuses: ["inquiry"], days_not_contacted: 1 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, thanks for your interest in {service_type}. Would you like to schedule a showing?" },
        { channel: "call", delay: 86400, template: "Hi {name}, {business_name} following up on your listing inquiry. Do you have a moment?" },
      ],
    },
    {
      name: "Market Update Reactivation",
      type: "reactivation",
      description: "Re-engage past leads with market updates",
      targetFilter: { days_not_contacted: 90, statuses: ["inactive", "completed"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, the market has been moving in your area. Curious about your home's value? {booking_link}" },
      ],
    },
  ],
};
