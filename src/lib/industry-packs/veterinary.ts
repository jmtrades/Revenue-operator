import type { IndustryPack } from "./types";

export const veterinaryPack: IndustryPack = {
  id: "veterinary",
  name: "Veterinary Clinic",
  icon: "PawPrint",
  greeting: "Thanks for calling {business_name}. Are you calling for an appointment, a refill, or is your pet having an emergency?",
  avgJobValue: 280,
  appointmentTypes: [
    { name: "Wellness Exam", duration: 30 },
    { name: "Sick Visit", duration: 30 },
    { name: "Vaccination", duration: 15 },
    { name: "Surgery", duration: 120 },
    { name: "Dental Cleaning", duration: 90 },
    { name: "Emergency", duration: 60 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "My pet is having an emergency", a: "I'm sorry to hear that. Let me get you to our emergency team right away. Can you tell me what's happening?" },
      { q: "How much does a vet visit cost?", a: "Visit costs depend on the type of appointment and your pet's needs. I can help you schedule and we'll give you an estimate beforehand." },
      { q: "Do you see cats and dogs?", a: "Yes! We see dogs, cats, and more. What kind of pet do you have and how can we help?" },
      { q: "I need a prescription refill", a: "Of course! Can I get your pet's name and your last name so I can pull up the record?" },
      { q: "Are vaccinations due?", a: "I can check your pet's vaccination schedule. Can I get your name and your pet's name?" },
      { q: "Do you offer payment plans?", a: "We offer several payment options. Our team can discuss them when you come in. Would you like to schedule?" },
    ],
    services: ["Wellness Exams", "Vaccinations", "Surgery", "Dental Care", "Emergency Care", "Lab Work", "Microchipping", "Spay/Neuter", "Prescription Refills"],
  },
  inboundWorkflows: [
    {
      name: "Missed Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 120, template: "Hi {name}, we missed your call at {business_name}. Need to schedule for your pet? Reply or call us back!" },
      ],
    },
    {
      name: "Appointment Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: {pet_name}'s appointment at {business_name} is tomorrow at {appointment_time}. Reply C to confirm." },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Annual Wellness Reminder",
      type: "reactivation",
      description: "Remind pet owners about annual checkups",
      targetFilter: { days_not_contacted: 330, statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, it's time for {pet_name}'s annual wellness visit at {business_name}! Book: {booking_link}" },
      ],
    },
    {
      name: "Post-Visit Review",
      type: "review_request",
      description: "Ask for review after visit",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for bringing {pet_name} to {business_name}! How was the visit? Leave a review: {review_link}" },
      ],
    },
  ],
};
