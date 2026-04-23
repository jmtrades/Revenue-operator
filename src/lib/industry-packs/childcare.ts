import type { IndustryPack } from "./types";

export const childcarePack: IndustryPack = {
  id: "childcare",
  name: "Childcare / Daycare",
  icon: "Baby",
  greeting:
    "Thanks for calling {business_name}! Are you looking to enroll, tour, or just get information about our program?",
  avgJobValue: 14400,
  appointmentTypes: [
    { name: "Facility Tour", duration: 45 },
    { name: "Enrollment Meeting", duration: 60 },
    { name: "Parent Orientation", duration: 60 },
    { name: "Child Assessment", duration: 30 },
    { name: "Trial Day", duration: 480 },
  ],
  knowledgeBase: {
    commonQuestions: [
      {
        q: "What ages do you accept?",
        a: "We care for children ages {age_range}. What's your child's age? I can check which classroom and availability fits.",
      },
      {
        q: "Do you have a waitlist?",
        a: "For some age groups, yes. If you tell me your child's age and target start date, I'll check availability or get you on the list.",
      },
      {
        q: "What's the tuition?",
        a: "Tuition varies by age group and schedule. Full-time and part-time options are available. Want me to text over the current rate sheet?",
      },
      {
        q: "Is your staff trained and background-checked?",
        a: "Yes — all staff are background-checked, CPR and first-aid certified, and complete {annual_training_hours} hours of ongoing training each year.",
      },
      {
        q: "Do you accept subsidies or vouchers?",
        a: "We accept {subsidy_programs}. Want me to connect you with our enrollment coordinator to verify your eligibility?",
      },
      {
        q: "What's your illness policy?",
        a: "I'll send our exact policy by text so you have it in writing — it covers fever thresholds, symptom-based exclusion periods, and return-to-care timing.",
      },
    ],
    services: [
      "Infant Care",
      "Toddler Care",
      "Preschool",
      "Pre-K",
      "Before & After School",
      "Summer Programs",
      "Drop-In Care",
      "Part-Time Schedules",
    ],
  },
  inboundWorkflows: [
    {
      name: "Inquiry → Tour",
      trigger: "missed_call",
      steps: [
        {
          channel: "sms",
          delay: 120,
          template:
            "Hi {name}, {business_name} here. Sorry we missed you! Want to book a quick tour? Reply with your child's age and a preferred morning/afternoon.",
        },
      ],
    },
    {
      name: "Tour → Enrollment",
      trigger: "appointment_booked",
      steps: [
        {
          channel: "email",
          delay: 0,
          template:
            "Subject: Looking forward to your tour at {business_name}\n\nHi {name}, we'll see you {tour_date}. We'll answer every question — bring anything you're curious about. Parking is at {parking_notes}.",
        },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Tour → Enrollment Follow-Up",
      type: "quote_chase",
      description: "Convert tour-takers into enrolled families.",
      targetFilter: { statuses: ["toured"], days_not_contacted: 2 },
      sequence: [
        {
          channel: "sms",
          delay: 0,
          template:
            "Hi {name}, {business_name} checking in after your tour. Any last questions? We can hold a spot in {classroom} for a few days while you decide.",
        },
      ],
    },
    {
      name: "Waitlist → Open Slot",
      type: "reactivation",
      description: "Notify waitlisted families when a spot opens.",
      targetFilter: { statuses: ["waitlisted"] },
      sequence: [
        {
          channel: "call",
          delay: 0,
          template:
            "Hi {name}, {business_name} — great news, a spot just opened in {classroom} starting {start_date}. Want to grab it?",
        },
      ],
    },
  ],
};
