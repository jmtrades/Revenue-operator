import type { IndustryPack } from "./types";

export const restaurantPack: IndustryPack = {
  id: "restaurant",
  name: "Restaurant & Hospitality",
  icon: "UtensilsCrossed",
  greeting: "Thanks for calling {business_name}. Would you like to make a reservation, place an order, or ask a question?",
  avgJobValue: 85,
  appointmentTypes: [
    { name: "Reservation (2 guests)", duration: 90 },
    { name: "Reservation (4 guests)", duration: 120 },
    { name: "Large Party (8+)", duration: 180 },
    { name: "Private Event", duration: 240 },
    { name: "Catering Consultation", duration: 45 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Do you take reservations?", a: "Yes! How many guests and what date and time were you thinking?" },
      { q: "What's on the menu?", a: "We have a great selection. Is there anything specific you're looking for — appetizers, entrees, desserts? I can also tell you about our specials." },
      { q: "Do you have vegetarian/vegan options?", a: "Yes, we have several options to accommodate dietary preferences. Would you like me to highlight some?" },
      { q: "Do you offer delivery or takeout?", a: "Yes! Would you like to place an order for pickup or delivery?" },
      { q: "Do you do catering?", a: "We do! What's the occasion and approximately how many guests? I can have our catering team put together a proposal." },
      { q: "Is there a wait right now?", a: "Let me check on that. Making a reservation is the best way to guarantee your table. Would you like to book one?" },
    ],
    services: ["Dine-In", "Takeout", "Delivery", "Catering", "Private Events", "Party Reservations", "Gift Cards"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 120, template: "Hi {name}, we missed your call at {business_name}. Want to make a reservation or place an order? Reply or call back!" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Post-Dining Review",
      type: "review_request",
      description: "Ask for review after dining",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for dining at {business_name}, {name}! Enjoyed your meal? We'd love a quick review: {review_link}" },
      ],
    },
    {
      name: "Event Reactivation",
      type: "reactivation",
      description: "Re-engage past event and catering clients",
      targetFilter: { days_not_contacted: 180, statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, planning any events? {business_name} would love to host you again! {booking_link}" },
      ],
    },
  ],
};
