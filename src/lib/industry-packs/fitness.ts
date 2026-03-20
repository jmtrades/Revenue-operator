import type { IndustryPack } from "./types";

export const fitnessPack: IndustryPack = {
  id: "fitness",
  name: "Fitness & Wellness",
  icon: "Dumbbell",
  greeting: "Thanks for calling {business_name}! Are you interested in membership, classes, or personal training?",
  avgJobValue: 1200,
  appointmentTypes: [
    { name: "Trial Class", duration: 60 },
    { name: "Personal Training Session", duration: 60 },
    { name: "Membership Consultation", duration: 30 },
    { name: "Body Assessment", duration: 45 },
    { name: "Group Class", duration: 45 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "How much is membership?", a: "We have several membership options to fit different needs and budgets. Would you like to come in for a tour and we can walk you through pricing?" },
      { q: "Do you offer a free trial?", a: "Yes! We'd love to have you try us out. When would you like to come in for a trial session?" },
      { q: "What classes do you offer?", a: "We offer a variety of classes including yoga, HIIT, spin, strength training, and more. What type of workout are you interested in?" },
      { q: "Do you have personal trainers?", a: "Absolutely! Our certified trainers create personalized programs. Would you like to book a consultation?" },
      { q: "What are your hours?", a: "Our hours are {business_hours}. Would you like to come in for a visit?" },
    ],
    services: ["Gym Membership", "Personal Training", "Group Classes", "Yoga", "HIIT", "Spin", "Nutrition Coaching", "Body Assessment"],
  },
  inboundWorkflows: [
    {
      name: "Missed Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 120, template: "Hi {name}, we missed your call at {business_name}! Interested in a free trial? Reply YES or call us back." },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Lapsed Member Reactivation",
      type: "reactivation",
      description: "Re-engage members who stopped coming",
      targetFilter: { days_not_contacted: 30, statuses: ["inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, we miss you at {business_name}! Come back with a special offer: {booking_link}" },
        { channel: "call", delay: 172800, template: "Hi {name}, {business_name} here. We noticed you haven't been in lately. Everything okay? We'd love to get you back." },
      ],
    },
    {
      name: "Post-Trial Follow-Up",
      type: "quote_chase",
      description: "Convert trial visitors to members",
      targetFilter: { statuses: ["trial"], days_not_contacted: 1 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, hope you enjoyed your trial at {business_name}! Ready to join? We have a special offer for new members." },
        { channel: "call", delay: 86400, template: "Hi {name}, {business_name} following up on your trial visit. How was it? Can we help you pick a membership?" },
      ],
    },
  ],
};
