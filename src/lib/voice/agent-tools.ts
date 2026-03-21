/**
 * Agent Tool Definitions for live voice calls.
 * These tools are passed to the voice server/assistant and executed
 * via webhook when the AI decides to use them during a conversation.
 *
 * Tools:
 *  1. book_appointment   – Book into connected calendar
 *  2. capture_lead        – Save lead info to database
 *  3. check_availability  – Check calendar for open slots
 *  4. transfer_call       – Transfer to a human
 *  5. send_sms            – Send a text message to the caller
 *  6. lookup_customer     – Look up existing customer by phone
 *  7. take_message        – Record a message for callback
 *  8. book_zoom_meeting   – Schedule a Zoom video call
 *  9. collect_payment     – Take a payment over the phone
 * 10. send_email          – Send a follow-up email
 * 11. check_order_status  – Look up an order or ticket
 * 12. create_estimate     – Generate a price estimate/quote
 */

import type { AssistantTool } from "@/lib/voice/types";

export const AGENT_TOOL_BOOK_APPOINTMENT: AssistantTool = {
  type: "function",
  name: "book_appointment",
  description:
    "Book an appointment for the caller. Use when the caller wants to schedule a visit, consultation, or service. Always confirm the date, time, and service before calling this.",
  parameters: {
    type: "object",
    properties: {
      date: { type: "string", description: "Appointment date in YYYY-MM-DD format" },
      time: { type: "string", description: "Appointment time in HH:MM format (24h)" },
      service: { type: "string", description: "The service or reason for the appointment" },
      caller_name: { type: "string", description: "Name of the person booking" },
      caller_phone: { type: "string", description: "Phone number of the caller" },
      caller_email: { type: "string", description: "Email (if provided)" },
      notes: { type: "string", description: "Any additional notes from the caller" },
    },
    required: ["date", "time", "service", "caller_name"],
  },
};

export const AGENT_TOOL_CHECK_AVAILABILITY: AssistantTool = {
  type: "function",
  name: "check_availability",
  description:
    "Check available appointment slots. Use when the caller asks about availability or when you need to offer time options.",
  parameters: {
    type: "object",
    properties: {
      date: { type: "string", description: "Date to check in YYYY-MM-DD format. Use today's date if not specified." },
      service: { type: "string", description: "Optional service type to filter slots by duration" },
    },
    required: ["date"],
  },
};

export const AGENT_TOOL_CAPTURE_LEAD: AssistantTool = {
  type: "function",
  name: "capture_lead",
  description:
    "Save a new lead or update an existing one. Use whenever you've gathered a caller's contact info and what they need.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Caller's full name" },
      phone: { type: "string", description: "Phone number" },
      email: { type: "string", description: "Email address if provided" },
      service_needed: { type: "string", description: "What they need or are interested in" },
      urgency: { type: "string", enum: ["low", "medium", "high", "emergency"], description: "How urgent their need is" },
      notes: { type: "string", description: "Any additional context from the conversation" },
    },
    required: ["name", "phone"],
  },
};

export const AGENT_TOOL_TRANSFER_CALL: AssistantTool = {
  type: "function",
  name: "transfer_call",
  description:
    "Transfer the call to a human team member. Use when the caller requests to speak with a person, or when the issue is beyond your ability to help.",
  parameters: {
    type: "object",
    properties: {
      reason: { type: "string", description: "Why the call is being transferred" },
      department: { type: "string", description: "Department or person to transfer to (if known)" },
      urgency: { type: "string", enum: ["normal", "urgent"], description: "Whether this needs immediate attention" },
    },
    required: ["reason"],
  },
};

export const AGENT_TOOL_SEND_SMS: AssistantTool = {
  type: "function",
  name: "send_sms",
  description:
    "Send a text message to the caller. Use to send confirmations, links, addresses, or follow-up details that are easier to read than hear.",
  parameters: {
    type: "object",
    properties: {
      to_phone: { type: "string", description: "Phone number to text" },
      message: { type: "string", description: "The text message content (keep under 160 chars when possible)" },
    },
    required: ["to_phone", "message"],
  },
};

export const AGENT_TOOL_LOOKUP_CUSTOMER: AssistantTool = {
  type: "function",
  name: "lookup_customer",
  description:
    "Look up an existing customer by phone number to pull up their history. Use at the start of a call if you have the caller's number, or when they mention being an existing customer.",
  parameters: {
    type: "object",
    properties: {
      phone: { type: "string", description: "Phone number to look up" },
    },
    required: ["phone"],
  },
};

export const AGENT_TOOL_TAKE_MESSAGE: AssistantTool = {
  type: "function",
  name: "take_message",
  description:
    "Record a message for callback. Use when the office is closed, the person they need isn't available, or the caller prefers a callback.",
  parameters: {
    type: "object",
    properties: {
      caller_name: { type: "string", description: "Name of the caller" },
      caller_phone: { type: "string", description: "Best callback number" },
      message: { type: "string", description: "The message content" },
      for_person: { type: "string", description: "Who the message is for (if specified)" },
      urgency: { type: "string", enum: ["normal", "urgent", "emergency"], description: "Message urgency level" },
      preferred_callback_time: { type: "string", description: "When the caller prefers to be called back" },
    },
    required: ["caller_name", "caller_phone", "message"],
  },
};

export const AGENT_TOOL_BOOK_ZOOM: AssistantTool = {
  type: "function",
  name: "book_zoom_meeting",
  description:
    "Schedule a Zoom video call with the caller. Use when the caller wants a virtual meeting, video consultation, demo, or remote appointment instead of an in-person visit.",
  parameters: {
    type: "object",
    properties: {
      date: { type: "string", description: "Meeting date in YYYY-MM-DD format" },
      time: { type: "string", description: "Meeting time in HH:MM format (24h)" },
      duration_minutes: { type: "number", description: "Meeting length in minutes (default 30)" },
      topic: { type: "string", description: "Meeting topic or purpose" },
      attendee_name: { type: "string", description: "Name of the person joining" },
      attendee_email: { type: "string", description: "Email to send the Zoom link to" },
      attendee_phone: { type: "string", description: "Phone number as fallback" },
      notes: { type: "string", description: "Any preparation or context for the meeting" },
    },
    required: ["date", "time", "topic", "attendee_name", "attendee_email"],
  },
};

export const AGENT_TOOL_COLLECT_PAYMENT: AssistantTool = {
  type: "function",
  name: "collect_payment",
  description:
    "Initiate a payment collection. Use when the caller wants to pay a balance, put down a deposit, or make a purchase over the phone. This sends a secure payment link via SMS — never ask for full card numbers on the call.",
  parameters: {
    type: "object",
    properties: {
      amount_cents: { type: "number", description: "Payment amount in cents (e.g. 5000 = $50.00)" },
      description: { type: "string", description: "What the payment is for" },
      customer_name: { type: "string", description: "Name on the payment" },
      customer_phone: { type: "string", description: "Phone number to send payment link to" },
      customer_email: { type: "string", description: "Email for receipt (optional)" },
      payment_type: { type: "string", enum: ["full", "deposit", "balance", "subscription"], description: "Type of payment" },
    },
    required: ["amount_cents", "description", "customer_name", "customer_phone"],
  },
};

export const AGENT_TOOL_SEND_EMAIL: AssistantTool = {
  type: "function",
  name: "send_email",
  description:
    "Send a follow-up email to the caller. Use for sending summaries, documents, proposals, confirmations, or any information the caller needs in writing.",
  parameters: {
    type: "object",
    properties: {
      to_email: { type: "string", description: "Recipient email address" },
      subject: { type: "string", description: "Email subject line" },
      body: { type: "string", description: "Email body content (plain text, keep professional and concise)" },
      template: { type: "string", enum: ["confirmation", "follow_up", "quote", "welcome", "general"], description: "Email template to use" },
      attachments: { type: "string", description: "Description of what to attach (e.g. 'quote PDF', 'service brochure')" },
    },
    required: ["to_email", "subject", "body"],
  },
};

export const AGENT_TOOL_CHECK_ORDER: AssistantTool = {
  type: "function",
  name: "check_order_status",
  description:
    "Look up an order, ticket, or job status. Use when a caller asks about the status of their order, service request, repair, or any tracked item.",
  parameters: {
    type: "object",
    properties: {
      order_id: { type: "string", description: "Order number, ticket ID, or reference number" },
      customer_phone: { type: "string", description: "Customer phone for lookup if no order ID" },
      customer_email: { type: "string", description: "Customer email for lookup if no order ID" },
    },
    required: [],
  },
};

export const AGENT_TOOL_CREATE_ESTIMATE: AssistantTool = {
  type: "function",
  name: "create_estimate",
  description:
    "Generate a price estimate or quote for the caller. Use when the caller asks 'how much' or wants a quote for a service. Captures their needs and sends a formal estimate.",
  parameters: {
    type: "object",
    properties: {
      customer_name: { type: "string", description: "Customer name" },
      customer_phone: { type: "string", description: "Phone number" },
      customer_email: { type: "string", description: "Email to send estimate to" },
      service_type: { type: "string", description: "The service being quoted" },
      description: { type: "string", description: "Detailed description of what the customer needs" },
      estimated_amount_cents: { type: "number", description: "Estimated cost in cents if known (e.g. 150000 = $1,500)" },
      urgency: { type: "string", enum: ["standard", "rush", "emergency"], description: "Timeline urgency" },
      notes: { type: "string", description: "Any additional details from the conversation" },
    },
    required: ["customer_name", "customer_phone", "service_type", "description"],
  },
};

export const AGENT_TOOL_SEARCH_KNOWLEDGE: AssistantTool = {
  type: "function",
  name: "search_knowledge",
  description:
    "Search the business knowledge base for an answer to the caller's question. Use this BEFORE saying you don't know something. This searches FAQs, service descriptions, policies, pricing info, and any information the business has provided. If this tool returns a result, use it to answer the caller naturally.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "The question or topic to search for (use the caller's exact words)" },
      category: { type: "string", enum: ["pricing", "hours", "services", "policies", "location", "staff", "general"], description: "Category to narrow the search" },
    },
    required: ["query"],
  },
};

export const AGENT_TOOL_CHECK_BUSINESS_HOURS: AssistantTool = {
  type: "function",
  name: "check_business_hours",
  description:
    "Check whether the business is currently open and what the hours are for a specific day. Use when a caller asks 'are you open?', 'what time do you close?', or 'are you open on Saturday?'.",
  parameters: {
    type: "object",
    properties: {
      day: { type: "string", description: "Day to check (e.g., 'today', 'tomorrow', 'Monday', 'Saturday')" },
    },
    required: [],
  },
};

/**
 * Get tools appropriate for the agent template and capabilities.
 */
export function getAgentTools(capabilities: string[]): AssistantTool[] {
  const tools: AssistantTool[] = [];

  // Always include: knowledge search, customer lookup, hours check, and message taking
  tools.push(AGENT_TOOL_SEARCH_KNOWLEDGE);
  tools.push(AGENT_TOOL_CHECK_BUSINESS_HOURS);
  tools.push(AGENT_TOOL_LOOKUP_CUSTOMER);
  tools.push(AGENT_TOOL_TAKE_MESSAGE);

  if (capabilities.includes("book_appointments")) {
    tools.push(AGENT_TOOL_BOOK_APPOINTMENT);
    tools.push(AGENT_TOOL_CHECK_AVAILABILITY);
  }

  if (capabilities.includes("capture_leads") || capabilities.includes("qualify_leads")) {
    tools.push(AGENT_TOOL_CAPTURE_LEAD);
  }

  if (capabilities.includes("transfer_calls") || capabilities.includes("route_calls")) {
    tools.push(AGENT_TOOL_TRANSFER_CALL);
  }

  if (capabilities.includes("follow_up") || capabilities.includes("outbound_calls") || capabilities.includes("send_emails")) {
    tools.push(AGENT_TOOL_SEND_SMS);
    tools.push(AGENT_TOOL_SEND_EMAIL);
  }

  if (capabilities.includes("book_zoom") || capabilities.includes("book_appointments")) {
    tools.push(AGENT_TOOL_BOOK_ZOOM);
  }

  if (capabilities.includes("collect_payments")) {
    tools.push(AGENT_TOOL_COLLECT_PAYMENT);
  }

  if (capabilities.includes("check_orders")) {
    tools.push(AGENT_TOOL_CHECK_ORDER);
  }

  if (capabilities.includes("create_estimates") || capabilities.includes("qualify_leads")) {
    tools.push(AGENT_TOOL_CREATE_ESTIMATE);
  }

  // If no specific capabilities, give a safe default set (core tools only).
  // Fewer tools = fewer hallucination opportunities for unconfigured agents.
  if (capabilities.length === 0) {
    return [
      AGENT_TOOL_SEARCH_KNOWLEDGE,
      AGENT_TOOL_CHECK_BUSINESS_HOURS,
      AGENT_TOOL_LOOKUP_CUSTOMER,
      AGENT_TOOL_CAPTURE_LEAD,
      AGENT_TOOL_BOOK_APPOINTMENT,
      AGENT_TOOL_CHECK_AVAILABILITY,
      AGENT_TOOL_TAKE_MESSAGE,
      AGENT_TOOL_TRANSFER_CALL,
    ];
  }

  return tools;
}

/** All available tools (for reference and documentation) */
export const ALL_AGENT_TOOLS: AssistantTool[] = [
  AGENT_TOOL_SEARCH_KNOWLEDGE,
  AGENT_TOOL_CHECK_BUSINESS_HOURS,
  AGENT_TOOL_BOOK_APPOINTMENT,
  AGENT_TOOL_CHECK_AVAILABILITY,
  AGENT_TOOL_CAPTURE_LEAD,
  AGENT_TOOL_TRANSFER_CALL,
  AGENT_TOOL_SEND_SMS,
  AGENT_TOOL_LOOKUP_CUSTOMER,
  AGENT_TOOL_TAKE_MESSAGE,
  AGENT_TOOL_BOOK_ZOOM,
  AGENT_TOOL_COLLECT_PAYMENT,
  AGENT_TOOL_SEND_EMAIL,
  AGENT_TOOL_CHECK_ORDER,
  AGENT_TOOL_CREATE_ESTIMATE,
];
