import type { IndustryPack } from "./types";

export const ecommercePack: IndustryPack = {
  id: "ecommerce",
  name: "E-Commerce",
  icon: "ShoppingCart",
  greeting: "Thank you for contacting {business_name}. How can I help with your order today?",
  avgJobValue: 85,
  appointmentTypes: [
    { name: "Customer Service Call", duration: 15 },
    { name: "Order Support", duration: 20 },
    { name: "Returns Consultation", duration: 30 },
    { name: "Technical Support", duration: 25 },
    { name: "Account Assistance", duration: 20 },
  ],
  knowledgeBase: {
    commonQuestions: [
      { q: "Where is my order?", a: "I can help you track your order! Can I get your order number? You can also track it anytime at {booking_link} or in your account dashboard." },
      { q: "What's your return policy?", a: "{business_name} allows returns within 30 days of purchase for a full refund. Items must be unused and in original packaging. Would you like to start a return?" },
      { q: "Do you offer exchanges?", a: "Absolutely! We can exchange items for different sizes or colors at no extra cost. What would you like to exchange?" },
      { q: "What are your business hours?", a: "Our customer service team is available {business_hours}. You can also submit requests anytime at {business_name} and we'll respond within 24 hours." },
      { q: "Do you have gift cards available?", a: "Yes! {business_name} offers gift cards in any amount. Perfect for any occasion. Would you like to purchase one?" },
    ],
    services: ["Order tracking", "Returns", "Exchanges", "Product info", "Shipping status", "Coupon/promo", "Account help", "Bulk orders", "Gift cards", "Warranty claims"],
  },
  inboundWorkflows: [
    {
      name: "Inbound Call Recovery",
      trigger: "missed_call",
      steps: [
        { channel: "sms", delay: 300, template: "Hi {name}, we missed your call to {business_name}. Need help with an order? Reply YES or visit us at {business_phone}." },
        { channel: "sms", delay: 14400, condition: "if_no_reply", template: "Hi {name}, following up from {business_name}. Our customer service team is ready to help with returns, exchanges, or order info." },
        { channel: "email", delay: 86400, condition: "if_no_reply", template: "Hi {name}, we noticed you called {business_name} earlier. How can we help? Reply to this email or visit our help center." },
      ],
    },
    {
      name: "Order Confirmation & Tracking",
      trigger: "appointment_booked",
      steps: [
        { channel: "sms", delay: 0, template: "Thanks for your order, {name}! Your {service_type} is on the way. Track it here: {booking_link}" },
        { channel: "sms", delay: 172800, template: "Hi {name}, just checking in on your {business_name} order. Still on track for delivery! Need anything?" },
      ],
    },
    {
      name: "Cart Abandonment Recovery",
      trigger: "no_show",
      steps: [
        { channel: "sms", delay: 1800, template: "Hi {name}, you left items in your cart at {business_name}. Complete your purchase here: {booking_link}" },
        { channel: "email", delay: 14400, condition: "if_no_reply", template: "Hi {name}, your cart is waiting! Don't miss out. Here's a special 10% off code: COMPLETE10 {booking_link}" },
        { channel: "sms", delay: 86400, condition: "if_no_reply", template: "Last chance, {name}! Your items are selling fast at {business_name}. {booking_link}" },
      ],
    },
  ],
  outboundCampaigns: [
    {
      name: "Win-Back Inactive Customer Campaign",
      type: "reactivation",
      description: "Re-engage customers who haven't purchased in 90+ days",
      targetFilter: { days_not_contacted: 90, statuses: ["completed", "inactive"] },
      sequence: [
        { channel: "sms", delay: 0, template: "Hi {name}, it's been a while! {business_name} has new arrivals you'll love. Browse now: {booking_link}" },
        { channel: "email", delay: 259200, template: "We miss you, {name}! Here's an exclusive 20% off code just for you: WELCOME20. Shop now: {booking_link}" },
        { channel: "sms", delay: 604800, template: "Final reminder, {name}! Don't miss out on amazing deals at {business_name}. {booking_link}" },
      ],
    },
    {
      name: "Product Inquiry Follow-Up",
      type: "quote_chase",
      description: "Follow up on product inquiries and quote requests",
      targetFilter: { statuses: ["quote_sent"], days_not_contacted: 2 },
      sequence: [
        { channel: "email", delay: 0, template: "Hi {name}, thanks for your interest in our {service_type}! Any questions? We're here to help." },
        { channel: "sms", delay: 86400, template: "Hi {name}, still interested in our {service_type}? Let's make sure you have all the info: {booking_link}" },
        { channel: "email", delay: 172800, template: "Hi {name}, limited quantity available on the {service_type}. Ready to order? {booking_link}" },
      ],
    },
    {
      name: "Post-Purchase Review & Feedback",
      type: "review_request",
      description: "Request product reviews and testimonials from buyers",
      targetFilter: { statuses: ["completed"] },
      sequence: [
        { channel: "sms", delay: 7200, template: "Thanks for your purchase, {name}! Help others by reviewing your {business_name} order: {review_link}" },
      ],
    },
  ],
};
