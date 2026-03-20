import type { IndustryPack } from "./types";

export const travelPack: IndustryPack = {
  id: "travel",
  name: "Travel Agency",
  icon: "Plane",
  greeting: "Welcome to {business_name}, where are we traveling to today?",
  avgJobValue: 3500,
  appointmentTypes: [
    { name: "Vacation Planning", duration: 60 },
    { name: "Flight Booking", duration: 45 },
    { name: "Cruise Consultation", duration: 60 },
    { name: "International Trip", duration: 75 },
    { name: "Travel Insurance Review", duration: 30 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Is there a charge for your travel planning services?", a: "No! {business_name} offers free travel consultations. We earn from provider commissions, so you get expert planning at no cost. Win-win!" },
      { q: "What are your hours?", a: "Our travel specialists are available {business_hours} to help you plan. We offer phone, email, and virtual consultations for your convenience." },
      { q: "Do you book honeymoons and romantic getaways?", a: "Yes! {business_name} specializes in romantic destinations and honeymoon packages. Let us create a magical experience for your special trip!" },
      { q: "Can you arrange corporate travel?", a: "Absolutely! {business_name} handles business travel, conference arrangements, and group transportation. We negotiate the best rates for corporate clients." },
      { q: "What about travel protection and insurance?", a: "We recommend and provide comprehensive travel insurance through {business_name} to protect against cancellations, emergencies, and lost luggage. Very affordable!" },
    ],
    services: [
      "Vacation packages",
      "Flights",
      "Hotels",
      "Cruises",
      "Car rental",
      "Travel insurance",
      "Group travel",
      "Honeymoon",
      "Corporate travel",
      "Visa assistance",
    ],
  },
  inboundWorkflows: [
    {
      name: "Missed Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Ready to plan your dream vacation? Reply YES or call us back!" },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, just following up from {business_name}. We have some amazing deals on flights and packages this month!" },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We'd love to help you plan your next adventure. Do you have time to discuss your travel plans?" },
      ],
    },
    {
      name: "Consultation Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: You have a travel consultation at {business_name} tomorrow at {appointment_time}. Please bring your passport!" },
        { channel: "sms", delay: -3600, template: "Your travel planning session starts in 1 hour at {business_name}. Get ready to plan something amazing!" },
      ],
    },
    {
      name: "Booking No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we were expecting you for your travel consultation at {business_name} today. We still want to help plan your trip!" },
        { channel: "call", delay: 14400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We missed you at your consultation. Let's reschedule so we can find you the perfect travel deal!" },
        { channel: "sms", delay: 86400, condition: "if_no_reply", template: "Hi {name}, no worries! Reschedule your travel consultation at {business_name}: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Inactive Traveler Reactivation",
      type: "reactivation",
      description: "Re-engage customers who haven't booked travel in 12+ months",
      targetFilter: { days_not_contacted: 365, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, your next adventure is calling! Check out our latest vacation deals at {business_name}: {booking_link}" },
        { channel: "call", delay: 259200, template: "Hi {name}, this is {business_name}. It's been a while since your last trip. Can we help you plan something amazing?" },
        { channel: "sms", delay: 604800, template: "Spring break is coming! {business_name} has exclusive travel packages. Plan your getaway: {booking_link}" },
      ],
    },
    {
      name: "Quote Follow-Up",
      type: "quote_chase",
      description: "Follow up on travel quotes that haven't been booked",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 5 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, just following up on the {service_type} package we quoted. Still interested? We can hold the price for 24 more hours!" },
        { channel: "call", delay: 172800, template: "Hi {name}, this is {business_name}. I'm calling about your {service_type} quote. Do you have any questions?" },
        { channel: "sms", delay: 432000, template: "Last chance, {name}! Your {service_type} quote expires soon. Book now at {business_name}: {booking_link}" },
      ],
    },
    {
      name: "Post-Booking Review Request",
      type: "review_request",
      description: "Request reviews after travel bookings are completed",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 604800, template: "Hope you had an amazing trip, {name}! Please share your experience with a review at {business_name}: {review_link}" },
      ],
    },
  ],
};
