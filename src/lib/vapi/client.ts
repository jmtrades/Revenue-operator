/**
 * Vapi API client: create assistant, create phone call (Twilio inbound).
 * Used when Twilio receives an inbound call and we hand off to Vapi for voice AI.
 */

const VAPI_BASE = "https://api.vapi.ai";

export interface CreateAssistantInput {
  name: string;
  systemPrompt: string;
  firstMessage: string;
}

export interface CreateCallInput {
  assistantId: string;
  customerNumber: string;
  /** Optional: echoed in webhook so we can match call_session */
  metadata?: Record<string, string>;
}

/**
 * Create a Vapi assistant with the given system prompt and first message.
 * Returns the assistant id to use in createCall.
 */
export async function createAssistant(input: CreateAssistantInput): Promise<{ id: string }> {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new Error("VAPI_API_KEY not set");

  const res = await fetch(`${VAPI_BASE}/assistant`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.name,
      firstMessage: input.firstMessage || "Hello, how can I help you today?",
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "system", content: input.systemPrompt }],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vapi createAssistant: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { id?: string };
  if (!data?.id) throw new Error("Vapi createAssistant: no id in response");
  return { id: data.id };
}

/**
 * Create a Vapi call for an inbound Twilio call. Returns TwiML to send back to Twilio.
 * Requires VAPI_PHONE_NUMBER_ID (your Vapi phone number id) for TwiML response.
 */
export async function createCallForTwilio(input: CreateCallInput): Promise<{ twiml: string }> {
  const key = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  if (!key) throw new Error("VAPI_API_KEY not set");
  if (!phoneNumberId) throw new Error("VAPI_PHONE_NUMBER_ID not set for Twilio handoff");

  const body: Record<string, unknown> = {
    phoneNumberId,
    phoneCallProviderBypassEnabled: true,
    customer: { number: input.customerNumber },
    assistantId: input.assistantId,
  };
  if (input.metadata && Object.keys(input.metadata).length > 0) {
    body.metadata = input.metadata;
  }

  const res = await fetch(`${VAPI_BASE}/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vapi createCall: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { phoneCallProviderDetails?: { twiml?: string }; id?: string };
  const twiml = data?.phoneCallProviderDetails?.twiml;
  if (!twiml || typeof twiml !== "string") {
    throw new Error("Vapi createCall: no twiml in response");
  }
  return { twiml };
}

/**
 * Start an outbound call (we call the customer). Uses same Vapi /call endpoint;
 * no TwiML needed. Returns call id if present.
 */
export async function createOutboundCall(input: CreateCallInput): Promise<{ callId?: string }> {
  const key = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  if (!key) throw new Error("VAPI_API_KEY not set");
  if (!phoneNumberId) throw new Error("VAPI_PHONE_NUMBER_ID not set for outbound");

  const body: Record<string, unknown> = {
    phoneNumberId,
    customer: { number: input.customerNumber },
    assistantId: input.assistantId,
  };
  if (input.metadata && Object.keys(input.metadata).length > 0) {
    body.metadata = input.metadata;
  }

  const res = await fetch(`${VAPI_BASE}/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vapi createOutboundCall: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { id?: string };
  return { callId: data?.id };
}
