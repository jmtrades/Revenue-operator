import type { IndustryPack } from "./types";

export const seniorCarePack: IndustryPack = {
  id: "senior_care",
  name: "Senior Care",
  icon: "HeartPulse",
  greeting:
    "Thanks for calling {business_name}! Are you looking for care for yourself or a loved one?",
  avgJobValue: 4500,
  appointmentTypes: [
    { name: "Care Assessment", duration: 60 },
    { name: "Family Consultation", duration: 45 },
    { name: "In-Home Tour", duration: 60 },
    { name: "Community Tour", duration: 60 },
    { name: "Care Plan Review", duration: 45 },
  ],
  knowledgeBase: {
    commonQuestions: [
      {
        q: "How much does senior care cost?",
        a: "Cost depends on level of care and hours needed. I can give you an accurate range after a 15-minute care assessment — would now or later today work?",
      },
      {
        q: "Do you accept Medicare or insurance?",
        a: "It depends on the service. Skilled nursing is often covered; companion care typically isn't. I'd rather have our intake coordinator verify your specific plan — can I have them call you today?",
      },
      {
        q: "Are your caregivers background-checked?",
        a: "Yes — every caregiver goes through a background check, training, and ongoing supervision. I can email our caregiver standards document if you'd like to review it.",
      },
      {
        q: "Can you help with dementia care?",
        a: "Yes — we have caregivers specifically trained in dementia and Alzheimer's care. Would a short call with our care manager be useful?",
      },
      {
        q: "How quickly can care start?",
        a: "For most situations we can begin care within 24-48 hours of the assessment. For urgent needs, same-day starts are sometimes possible — what's your timeline?",
      },
    ],
    services: [
      "In-Home Personal Care",
      "Companion Care",
      "Skilled Nursing",
      "Dementia & Alzheimer's Care",
      "Respite Care",
      "Assisted Living",
      "Memory Care",
      "Hospice Support",
    ],
  },
  inboundWorkflows: [
    {
      name: "Family Inquiry Follow-Up",
      trigger: "missed_call",
      steps: [
        {
          channel: "sms",
          delay: 120,
          template:
            "Hi {name}, this is {business_name}. Sorry we missed you. We know these calls are hard — when you're ready, reply with the best time to talk and I'll call back personally.",
        },
      ],
    },
    {
      name: "Post-Assessment Care Plan Delivery",
      trigger: "appointment_booked",
      steps: [
        {
          channel: "email",
          delay: 0,
          template:
            "Subject: Your care plan from {business_name}\n\nHi {name}, attached is the care plan we discussed. Please review and let me know if anything needs adjusting. I'll call {follow_up_date} to walk through next steps.",
        },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Assessment → Service Start",
      type: "quote_chase",
      description:
        "Families often take time to decide. Gentle follow-ups keep us in their options without pressuring.",
      targetFilter: { statuses: ["assessed"], days_not_contacted: 3 },
      sequence: [
        {
          channel: "sms",
          delay: 0,
          template:
            "Hi {name}, {business_name} checking in. No rush — just wanted you to know we're here when you're ready and can start as soon as you decide.",
        },
        {
          channel: "call",
          delay: 432000,
          template:
            "Hi {name}, checking back in on the care plan we discussed. Any questions I can answer? Even if you've chosen another provider I'd love to hear how we can help in the future.",
        },
      ],
    },
  ],
};
