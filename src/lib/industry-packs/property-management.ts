import type { IndustryPack } from "./types";

export const propertyManagementPack: IndustryPack = {
  id: "property_management",
  name: "Property Management",
  icon: "Building",
  greeting: "Thank you for calling {business_name}, how can I assist you with your property today?",
  avgJobValue: 18000,
  appointmentTypes: [
    { name: "Property Inspection", duration: 90 },
    { name: "Tenant Screening", duration: 60 },
    { name: "Lease Consultation", duration: 45 },
    { name: "Maintenance Assessment", duration: 120 },
    { name: "Rent Collection Review", duration: 30 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "What property management services do you offer?", a: "{business_name} offers tenant screening, lease management, rent collection, maintenance coordination, and eviction services. Which service are you interested in?" },
      { q: "What are your hours?", a: "Our office hours are {business_hours}. We also have an after-hours emergency line for urgent property issues." },
      { q: "How much do your property management services cost?", a: "Our fees typically run 8-12% of monthly rental income, depending on the services needed. We'd be happy to provide a customized quote for your property." },
      { q: "Can you help with problematic tenants?", a: "Yes, we handle tenant disputes, late payments, and eviction processes. {business_name} has extensive experience managing difficult situations professionally and legally." },
      { q: "Do you provide maintenance services?", a: "We coordinate maintenance through our network of vetted contractors. From minor repairs to major renovations, we handle it all for you." },
    ],
    services: ["Tenant screening", "Lease management", "Rent collection", "Maintenance", "Eviction", "Property inspection", "Vacancy marketing", "HOA management"],
  },
  inboundWorkflows: [
    {
      name: "Missed Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call at {business_name}. Need help with your property? Reply YES or call us back at {business_phone}." },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, following up from {business_name}. Our property managers are ready to assist with your management needs." },
        { channel: "call", delay: 86400, condition: "if_no_reply", script: "Hi {name}, this is {business_name} checking in on your call. We'd like to discuss how we can help manage your property more effectively." },
      ],
    },
    {
      name: "Consultation Reminder",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: -86400, template: "Reminder: You have a {appointment_type} scheduled with {business_name} tomorrow at {appointment_time}. Reply C to confirm or R to reschedule." },
        { channel: "sms", delay: -3600, template: "Your consultation at {business_name} is in 1 hour at {appointment_time}. See you soon!" },
      ],
    },
    {
      name: "No-Show Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, we missed you for your {appointment_type} at {business_name} today. Would you like to reschedule?" },
        { channel: "call", delay: 14400, condition: "if_no_reply", script: "Hi {name}, this is {business_name}. We had you scheduled for a consultation today. Can we find another time this week that works?" },
        { channel: "sms", delay: 86400, condition: "if_no_reply", template: "No worries, {name}! Let's reschedule your property consultation: {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Landlord Reactivation Campaign",
      type: "reactivation",
      description: "Re-engage former clients to offer updated management services",
      targetFilter: { days_not_contacted: 365, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, managing properties can be stressful. {business_name} offers comprehensive solutions. Let's discuss your needs: {booking_link}" },
        { channel: "call", delay: 259200, template: "Hi {name}, this is {business_name}. We'd love to help you with property management again. Do you have some time to discuss your current situation?" },
        { channel: "sms", delay: 604800, template: "Last reminder, {name}! Experienced property management saves time and money. {business_name} is ready to help: {booking_link}" },
      ],
    },
    {
      name: "Management Plan Follow-Up",
      type: "quote_chase",
      description: "Follow up on management proposals sent to potential clients",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 3 },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, following up on the management plan we sent. Do you have questions about our {service_type} services?" },
        { channel: "sms", delay: 172800, template: "Hi {name}, we want to ensure you have all the details. Ready to discuss implementation? {booking_link}" },
        { channel: "call", delay: 432000, template: "Hi {name}, this is {business_name}. I'm calling about the property management proposal. Do you have a moment to discuss?" },
      ],
    },
    {
      name: "Client Testimonial & Review Request",
      type: "review_request",
      description: "Request reviews and testimonials from satisfied clients",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for working with {business_name}, {name}! Your review helps other landlords like you. Share your experience: {review_link}" },
      ],
    },
  ],
};
