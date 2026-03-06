/**
 * Tool/function definitions for Vapi (or other) voice agents.
 * Used when creating the assistant and when handling webhook function-calls.
 */

export interface WorkspaceForFunctions {
  id: string;
  capabilities?: string[] | null;
}

export interface AgentFunctionDef {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required: string[];
  };
}

export function buildAgentFunctions(workspace: WorkspaceForFunctions): AgentFunctionDef[] {
  const fns: AgentFunctionDef[] = [
    {
      name: "capture_lead",
      description: "Save a new lead when you have their name and contact info",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Caller full name" },
          phone: { type: "string", description: "Caller phone number" },
          email: { type: "string", description: "Caller email (if provided)" },
          service_requested: { type: "string", description: "What the caller needs" },
          notes: { type: "string", description: "Any additional context" },
          urgency: { type: "string", enum: ["low", "medium", "high"], description: "How urgent is the request" },
        },
        required: ["name"],
      },
    },
    {
      name: "send_sms",
      description: "Send a text message to the caller with details, confirmation, or follow-up",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Phone number to text" },
          message: { type: "string", description: "Text message content" },
        },
        required: ["to", "message"],
      },
    },
    {
      name: "transfer_call",
      description: "Transfer the call to a specific person or department",
      parameters: {
        type: "object",
        properties: {
          destination: { type: "string", description: "Phone number or name to transfer to" },
          reason: { type: "string", description: "Why the caller is being transferred" },
        },
        required: ["destination"],
      },
    },
  ];

  const caps = workspace.capabilities ?? [];
  const canBook = caps.includes("book_appointments") || caps.includes("appointments");

  if (canBook) {
    fns.push({
      name: "check_availability",
      description: "Check available appointment slots for a given date",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date to check (YYYY-MM-DD)" },
          service: { type: "string", description: "Type of appointment" },
        },
        required: ["date"],
      },
    });
    fns.push({
      name: "book_appointment",
      description: "Book an appointment for the caller",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:MM in 24h format" },
          service: { type: "string" },
          notes: { type: "string" },
        },
        required: ["name", "date", "time"],
      },
    });
  }

  return fns;
}
