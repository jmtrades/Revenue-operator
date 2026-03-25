import type { IndustryPack } from "./types";

export const photographyPack: IndustryPack = {
  id: "photography",
  name: "Photography Studio",
  icon: "Camera",
  greeting: "Thank you for calling {business_name}, let's capture your special moments!",
  avgJobValue: 2500,
  appointmentTypes: [
    { name: "Wedding Consultation", duration: 60 },
    { name: "Portrait Session", duration: 90 },
    { name: "Event Photography", duration: 480 },
    { name: "Product Photography", duration: 120 },
    { name: "Family Photos", duration: 60 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "What types of photography do you offer?", a: "{business_name} specializes in weddings, portraits, corporate events, product photography, and family sessions. What type of shoot are you interested in?" },
      { q: "What are your hours?", a: "Our office is open {business_hours}. Shoots are available by appointment, and we offer flexible scheduling for events and sessions." },
      { q: "How much does photography cost?", a: "Our packages start at $500 for portrait sessions and vary based on session length and deliverables. Let's discuss your needs for a custom quote." },
      { q: "When will I get my photos?", a: "{business_name} typically delivers edited photos within 2-3 weeks. Rush delivery is available for an additional fee. We'll discuss timing during your consultation." },
      { q: "Do you offer engagement/wedding packages?", a: "Absolutely! We offer comprehensive wedding packages including engagement shots, ceremony, reception, and album creation. Let's schedule a consultation!" },
    ],
    services: ["Wedding", "Portrait", "Corporate headshot", "Event", "Product", "Real estate", "Maternity", "Newborn", "Family", "Senior portrait"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Let's capture your special moments! Reply YES or call us at {business_phone}." },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, following up from {business_name}. We have dates available for your photography session!" },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name} checking in. We'd love to discuss your photography needs and book your session." },
      ],
    },
    {
      name: "Session Confirmation & Details",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: Your {appointment_type} is scheduled at {business_name} tomorrow at {appointment_time}. Reply C to confirm or R to reschedule." },
        { channel: "email", delay: -3600, template: "Your photo session starts in 1 hour at {appointment_time}. Please arrive 10 minutes early. We're excited to work with you!" },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we missed you for your {appointment_type} at {business_name} today. Would you like to reschedule?" },
        { channel: "call", delay: 14400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We had you scheduled for a photo session today. Is everything okay? Let's get you rescheduled." },
        { channel: "email", delay: 86400, condition: "if_no_reply", template: "Hi {name}, let's reschedule your photo session at {business_name}: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Seasonal Photo Campaign",
      type: "reactivation",
      description: "Re-engage past clients for seasonal and family photo sessions",
      targetFilter: { days_not_contacted: 365, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "It's time for updated photos! {business_name} offers holiday family sessions, headshots, and more. Book now: {booking_link}" },
        { channel: "email", delay: 259200, template: "Hi {name}, create lasting memories with {business_name}! Schedule your session today: {booking_link}" },
        { channel: "call", delay: 604800, template: "Hi {name}, this is {business_name}. We'd love to capture your memories again. Do you have time for a photo session soon?" },
      ],
    },
    {
      name: "Photography Package Quote Follow-Up",
      type: "quote_chase",
      description: "Follow up on photography package quotes",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 3 },
      sequence: [
        { channel: "email", delay: 0, template: "Hi {name}, thanks for your interest in our {service_type} package! Any questions? We're happy to customize it for you." },
        { channel: "sms", delay: 172800, template: "Hi {name}, ready to book your {service_type}? Our dates are filling up: {booking_link}" },
        { channel: "call", delay: 432000, template: "Hi {name}, this is {business_name}. I wanted to follow up on your photography quote. Ready to move forward?" },
      ],
    },
    {
      name: "Post-Session Gallery & Review Request",
      type: "review_request",
      description: "Share gallery and request testimonials from happy clients",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "email", delay: 7200, template: "Your photos are ready, {name}! View your {business_name} gallery here: {booking_link} Please leave a review: {review_link}" },
      ],
    },
  ],
};
