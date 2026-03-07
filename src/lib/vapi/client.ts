/**
 * Vapi API client: create assistant, create phone call (Twilio inbound).
 * Uses ElevenLabs for TTS and Deepgram for STT when configured for human-like voice.
 */

const VAPI_BASE = "https://api.vapi.ai";

const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah — warm, professional

export interface CreateAssistantInput {
  name: string;
  systemPrompt: string;
  firstMessage: string;
  /** Optional: end call phrase */
  endCallMessage?: string;
  /** Optional: ElevenLabs voice id. When set, uses eleven_turbo_v2_5 for low latency. */
  voiceId?: string | null;
  /** Optional: language for Deepgram (e.g. en, es). */
  language?: string | null;
  /** Optional: workspace id for webhook metadata. */
  workspaceId?: string | null;
  /** Optional: tool/function definitions for capture_lead, book_appointment, send_sms, etc. */
  toolCalls?: Array<{ name: string; description: string; parameters: Record<string, unknown> }>;
  /** Optional: human voice tuning exposed in agent settings. */
  voiceSettings?: {
    stability?: number;
    speed?: number;
    responseDelay?: number;
    backchannel?: boolean;
    denoising?: boolean;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
}

export interface CreateCallInput {
  assistantId: string;
  customerNumber: string;
  /** Optional: echoed in webhook so we can match call_session */
  metadata?: Record<string, string>;
}

/**
 * Create a Vapi assistant. When voiceId is provided, uses ElevenLabs turbo + Deepgram Nova-2
 * for human-like voice and low latency. Otherwise falls back to OpenAI model + default config.
 */
export async function createAssistant(input: CreateAssistantInput): Promise<{ id: string }> {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new Error("VAPI_API_KEY not set");

  const firstMessage = input.firstMessage || "Hello, how can I help you today?";
  const voiceId = (input.voiceId ?? "").trim() || DEFAULT_VOICE_ID;
  const lang = (input.language ?? "en").trim() || "en";
  const voiceSettings = input.voiceSettings ?? {};

  const body: Record<string, unknown> = {
    name: input.name,
    firstMessage,
    endCallMessage: input.endCallMessage ?? `Thank you for calling. Have a great day!`,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      temperature: 0.45,
      maxTokens: 350,
      messages: [{ role: "system", content: input.systemPrompt }],
    },
    voice: {
      provider: "elevenlabs",
      voiceId,
      model: "eleven_turbo_v2_5",
      stability: voiceSettings.stability ?? 0.55,
      speed: voiceSettings.speed ?? 1,
      similarityBoost: voiceSettings.similarityBoost ?? 0.8,
      style: voiceSettings.style ?? 0.35,
      useSpeakerBoost: voiceSettings.useSpeakerBoost ?? true,
      optimizeStreamingLatency: 4,
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: lang,
      smartFormat: true,
    },
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 600,
    backgroundSound: "off",
    backchannelingEnabled: voiceSettings.backchannel ?? true,
    backgroundDenoisingEnabled: voiceSettings.denoising ?? true,
    responseDelaySeconds: voiceSettings.responseDelay ?? 0.4,
    numWordsToInterruptAssistant: 2,
    modelOutputInMessagesEnabled: true,
  };

  if (input.workspaceId) {
    body.metadata = { workspace_id: input.workspaceId };
  }

  if (Array.isArray(input.toolCalls) && input.toolCalls.length > 0) {
    body.toolCalls = input.toolCalls.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  const res = await fetch(`${VAPI_BASE}/assistant`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
 * Update an existing Vapi assistant (same shape as create). Use when user changes greeting, voice, or knowledge.
 */
export async function updateAssistant(
  assistantId: string,
  input: CreateAssistantInput
): Promise<{ id: string }> {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new Error("VAPI_API_KEY not set");

  const firstMessage = input.firstMessage || "Hello, how can I help you today?";
  const voiceId = (input.voiceId ?? "").trim() || DEFAULT_VOICE_ID;
  const lang = (input.language ?? "en").trim() || "en";
  const voiceSettings = input.voiceSettings ?? {};

  const body: Record<string, unknown> = {
    name: input.name,
    firstMessage,
    endCallMessage: input.endCallMessage ?? `Thank you for calling. Have a great day!`,
    model: {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      temperature: 0.45,
      maxTokens: 350,
      messages: [{ role: "system", content: input.systemPrompt }],
    },
    voice: {
      provider: "elevenlabs",
      voiceId,
      model: "eleven_turbo_v2_5",
      stability: voiceSettings.stability ?? 0.55,
      speed: voiceSettings.speed ?? 1,
      similarityBoost: voiceSettings.similarityBoost ?? 0.8,
      style: voiceSettings.style ?? 0.35,
      useSpeakerBoost: voiceSettings.useSpeakerBoost ?? true,
      optimizeStreamingLatency: 4,
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: lang,
      smartFormat: true,
    },
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 600,
    backgroundSound: "off",
    backchannelingEnabled: voiceSettings.backchannel ?? true,
    backgroundDenoisingEnabled: voiceSettings.denoising ?? true,
    responseDelaySeconds: voiceSettings.responseDelay ?? 0.4,
    numWordsToInterruptAssistant: 2,
    modelOutputInMessagesEnabled: true,
  };

  if (input.workspaceId) body.metadata = { workspace_id: input.workspaceId };
  if (Array.isArray(input.toolCalls) && input.toolCalls.length > 0) {
    body.toolCalls = input.toolCalls.map((t) => ({
      type: "function" as const,
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
  }

  const res = await fetch(`${VAPI_BASE}/assistant/${assistantId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vapi updateAssistant: ${res.status} ${err}`);
  }
  return { id: assistantId };
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
