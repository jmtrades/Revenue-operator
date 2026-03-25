import type { IndustryPack } from "./types";

export const petGroomingPack: IndustryPack = {
  id: "pet_grooming",
  name: "Pet Grooming",
  icon: "Scissors",
  greeting: "Welcome to {business_name}! We're excited to pamper your furry friend today!",
  avgJobValue: 75,
  appointmentTypes: [
    { name: "Bath Service", duration: 30 },
    { name: "Haircut & Style", duration: 60 },
    { name: "Nail Trim", duration: 15 },
    { name: "Full Grooming Package", duration: 90 },
    { name: "De-shedding Treatment", duration: 45 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "How often should my dog be groomed?", a: "For most dogs, we recommend grooming every 6-8 weeks. However, it depends on your dog's breed and coat type. Our team at {business_name} can recommend the perfect schedule for your pet during their first visit!" },
      { q: "Do you have experience with anxious pets?", a: "Absolutely! Our groomers at {business_name} are trained to work with nervous or anxious pets. We take time to make them comfortable and can discuss calming techniques during your appointment." },
      { q: "What are your hours?", a: "We're open {business_hours}. We recommend booking appointments in advance, especially during weekends. Walk-ins are welcome based on availability!" },
      { q: "Can you handle matted coats?", a: "Yes, we can work with matted coats! However, heavy matting may require longer grooming time or multiple sessions. Please call ahead so we can schedule appropriate time for your pet." },
      { q: "Do you offer flea and tick treatments?", a: "Yes! We offer flea and tick treatments as part of our grooming services at {business_name}. We use pet-safe products and can discuss options with you based on your pet's needs." },
    ],
    services: [
      "Bath",
      "Haircut",
      "Nail trim",
      "Ear cleaning",
      "De-shedding",
      "Flea treatment",
      "Teeth brushing",
      "Puppy intro",
      "Hand stripping",
      "Show prep",
    ],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Ready to pamper your pup? Reply YES or call us back at {business_phone}." },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, it's {business_name}! We'd love to give your pet a fresh grooming. Book your appointment today: {booking_link}" },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We wanted to follow up about scheduling your pet's grooming appointment. When would work for you?" },
      ],
    },
    {
      name: "Appointment Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -3600, template: "Reminder: {name} has a {appointment_type} appointment at {business_name} in 1 hour at {appointment_time}. See you soon!" },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we were expecting your furry friend for their {appointment_type} at {business_name} today. Would you like to reschedule?" },
        { channel: "sms", delay: 86400, condition: "if_no_reply", template: "Hi {name}, no worries! Your pet's next grooming appointment awaits. Reschedule now: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Regular Grooming Reminder",
      type: "reactivation",
      description: "Re-engage pet owners who haven't booked grooming in 8+ weeks",
      targetFilter: { days_not_contacted: 56, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, it's time for {pet_name}'s grooming! {business_name} is ready to make your pup look amazing. Book today: {booking_link}" },
        { channel: "call", delay: 259200, template: "Hi {name}, this is {business_name}. Your pet is due for grooming. I'd love to get them scheduled. What date works for you?" },
        { channel: "sms", delay: 604800, template: "Don't wait! Keep {pet_name} looking and feeling great with {business_name}. Limited slots available this week: {booking_link}" },
      ],
    },
    {
      name: "New Service Upsell",
      type: "quote_chase",
      description: "Follow up on customers interested in additional grooming services",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 3 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, interested in our de-shedding treatment for {pet_name}? It really helps reduce fur around your home. More info: {booking_link}" },
        { channel: "sms", delay: 172800, template: "Hi {name}, {business_name} also offers nail trimming and ear cleaning services. Keep your pet healthy and happy!" },
        { channel: "call", delay: 432000, template: "Hi {name}, this is {business_name}. I wanted to see if you had any questions about the grooming services we quoted. Happy to help!" },
      ],
    },
    {
      name: "Pet Care Review Request",
      type: "review_request",
      description: "Request reviews after grooming services",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for choosing {business_name}, {name}! How did {pet_name} look after their appointment? Leave us a review: {review_link}" },
      ],
    },
  ],
};
