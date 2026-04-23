import type { IndustryPack } from "./types";

export const mentalHealthPack: IndustryPack = {
  id: "mental_health",
  name: "Mental Health / Therapy",
  icon: "Brain",
  greeting:
    "Thanks for calling {business_name}. Are you looking for yourself or someone else, and roughly what are you hoping to work on?",
  avgJobValue: 1200,
  appointmentTypes: [
    { name: "Intake Consultation", duration: 60 },
    { name: "Individual Therapy", duration: 50 },
    { name: "Couples Therapy", duration: 80 },
    { name: "Family Therapy", duration: 80 },
    { name: "Psychiatric Evaluation", duration: 60 },
  ],
  knowledgeBase: {
    commonQuestions: [
      {
        q: "Do you take my insurance?",
        a: "Let me check — can I get your insurance carrier and member ID? I'll verify benefits and text you back within the hour.",
      },
      {
        q: "How much does a session cost without insurance?",
        a: "Self-pay rates vary by provider. I can send a text with our exact rates and a list of therapists with openings — is that OK?",
      },
      {
        q: "How quickly can I get in?",
        a: "For new patients we typically have openings within {next_opening_window}. For urgent needs we also have same-week slots — what sounds right?",
      },
      {
        q: "Do you offer telehealth?",
        a: "Yes — we offer HIPAA-compliant video sessions. Many patients prefer them. Want your first session to be video or in-person?",
      },
      {
        q: "Is what I tell you confidential?",
        a: "Yes — everything you share is protected under our HIPAA privacy practices with very limited legal exceptions for safety. Want me to send our notice of privacy practices?",
      },
    ],
    services: [
      "Individual Therapy",
      "Couples Therapy",
      "Family Therapy",
      "Group Therapy",
      "Psychiatric Evaluation",
      "Medication Management",
      "Telehealth",
      "EAP / Crisis Support",
    ],
  },
  inboundWorkflows: [
    {
      name: "Gentle Intake Follow-Up",
      trigger: "missed_call",
      steps: [
        {
          channel: "sms",
          delay: 180,
          template:
            "Hi, this is {business_name}. Sorry we missed you — we know reaching out takes courage. When you're ready, reply with a good time and we'll call back privately.",
        },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Post-Intake → First Session",
      type: "quote_chase",
      description:
        "Reach out to people who completed intake but haven't booked their first session.",
      targetFilter: { statuses: ["intake_completed"], days_not_contacted: 3 },
      sequence: [
        {
          channel: "sms",
          delay: 0,
          template:
            "Hi {name}, {business_name} here. Matched you with {therapist_name} — they have openings {proposed_times}. Reply with what works or 'other' for more options.",
        },
      ],
    },
    {
      name: "No-Show Recovery",
      type: "no_show_recovery",
      description: "Reach out gently after a no-show — life happens.",
      targetFilter: { statuses: ["no_show"], days_not_contacted: 1 },
      sequence: [
        {
          channel: "sms",
          delay: 0,
          template:
            "Hi {name}, we missed you today — totally no problem. Want to pick another time? Reply with a day/time and we'll get you back on the calendar.",
        },
      ],
    },
  ],
};
