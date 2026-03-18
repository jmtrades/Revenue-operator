/**
 * Vapi API client: create assistant, create phone call (Twilio inbound).
 *
 * COST OPTIMIZATION (Phase 1):
 * - Default TTS: Deepgram Aura-2 ($0.022/min vs ElevenLabs $0.05/min)
 * - Default LLM: Claude Haiku 4.5 for routine calls ($0.009/min vs Sonnet $0.03/min)
 * - ElevenLabs available as premium TTS via usePremiumVoice flag
 * - Claude Sonnet available for complex calls via useComplexLlm flag
 *
 * Phase 2 will replace Vapi entirely with Pipecat (saves $0.05/min orchestration fee).
 */

import { getVapiServerKey } from "./env";
import { HUMAN_VOICE_DEFAULTS } from "@/lib/voice/human-voice-defaults";
import { ACTIVE_VOICE_STACK } from "@/lib/voice/types";

const VAPI_BASE = "https://api.vapi.ai";

const DEFAULT_VOICE_ID = "aura-asteria-en"; // Deepgram Aura-2 — warm, professional
const PREMIUM_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // ElevenLabs Sarah — premium add-on

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
  /** Optional: use premium ElevenLabs voice instead of Deepgram Aura-2 default. */
  usePremiumVoice?: boolean;
  /** Optional: use Claude Sonnet for complex calls instead of Haiku default. */
  useComplexLlm?: boolean;
  /** Optional: max call duration in seconds. Default 600 (10 min). */
  maxDurationSeconds?: number | null;
  /** Optional: AMD config for outbound voicemail detection. */
  voicemailDetection?: {
    provider: "vapi" | "google" | "openai" | "twilio";
    type?: "audio" | "transcript";
    backoffPlan?: { startAtSeconds: number; frequencySeconds: number; maxRetries: number };
    beepMaxAwaitSeconds?: number;
  } | null;
  /** Optional: message to leave when voicemail is detected (outbound). Omit or empty to hang up. */
  voicemailMessage?: string | null;
}

export interface CreateCallInput {
  assistantId: string;
  customerNumber: string;
  /** Optional: echoed in webhook so we can match call_session */
  metadata?: Record<string, string>;
}

/**
 * Build the Vapi assistant request body. Shared between create and update.
 * Uses Deepgram Aura-2 + Claude Haiku by default (Phase 1 cost optimization).
 * Set usePremiumVoice=true for ElevenLabs, useComplexLlm=true for Claude Sonnet.
 */
function buildAssistantBody(input: CreateAssistantInput): Record<string, unknown> {
  const firstMessage = input.firstMessage || "Hello, how can I help you today?";
  const lang = (input.language ?? "en").trim() || "en";
  const voiceSettings = input.voiceSettings ?? {};
  const v = { ...HUMAN_VOICE_DEFAULTS, ...voiceSettings };

  // Cost optimization: Deepgram Aura-2 default ($0.022/min), ElevenLabs for premium ($0.05/min)
  const usePremium = input.usePremiumVoice === true;
  const voiceId = usePremium
    ? ((input.voiceId ?? "").trim() || PREMIUM_VOICE_ID)
    : ((input.voiceId ?? "").trim() || DEFAULT_VOICE_ID);

  // Cost optimization: Haiku for routine ($0.009/min), Sonnet for complex ($0.03/min)
  const useComplex = input.useComplexLlm === true;
  const llmModel = useComplex ? "claude-sonnet-4-20250514" : "claude-haiku-4-5-20251001";
  const maxTokens = useComplex ? 350 : 250;

  const voiceConfig = usePremium
    ? {
        provider: "11labs",
        voiceId,
        model: "eleven_turbo_v2_5",
        stability: v.stability,
        speed: v.speed,
        similarityBoost: v.similarityBoost,
        style: v.style,
        useSpeakerBoost: v.useSpeakerBoost,
        optimizeStreamingLatency: 4,
      }
    : {
        provider: "deepgram",
        voiceId,
        model: "aura-2",
      };

  const body: Record<string, unknown> = {
    name: input.name,
    firstMessage,
    endCallMessage: input.endCallMessage ?? `Thank you for calling. Have a great day!`,
    model: {
      provider: "anthropic",
      model: llmModel,
      temperature: 0.45,
      maxTokens,
      messages: [{ role: "system", content: input.systemPrompt }],
    },
    voice: voiceConfig,
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: lang,
      smartFormat: true,
    },
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: input.maxDurationSeconds && input.maxDurationSeconds > 0 ? input.maxDurationSeconds : 600,
    backgroundSound: "off",
    backchannelingEnabled: v.backchannel,
    backgroundDenoisingEnabled: v.denoising,
    responseDelaySeconds: v.responseDelay,
    numWordsToInterruptAssistant: 2,
    modelOutputInMessagesEnabled: true,
  };

  if (input.workspaceId) {
    body.metadata = { workspace_id: input.workspaceId };
  }

  if (Array.isArray(input.toolCalls) && input.toolCalls.length > 0) {
    (body.model as { tools?: unknown[] }).tools = input.toolCalls.map((t) => ({
      type: "function" as const,
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
  }

  if (input.voicemailDetection && Object.keys(input.voicemailDetection).length > 0) {
    body.voicemailDetection = input.voicemailDetection;
  }
  if (input.voicemailMessage != null && String(input.voicemailMessage).trim()) {
    body.voicemailMessage = String(input.voicemailMessage).trim();
  }

  return body;
}

/**
 * Create a Vapi assistant. Uses Deepgram Aura-2 + Claude Haiku by default.
 * Set usePremiumVoice/useComplexLlm for premium options.
 */
export async function createAssistant(input: CreateAssistantInput): Promise<{ id: string }> {
  const key = getVapiServerKey();
  if (!key) throw new Error("VAPI_API_KEY not set");

  const body = buildAssistantBody(input);

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
  const key = getVapiServerKey();
  if (!key) throw new Error("VAPI_API_KEY not set");

  const body = buildAssistantBody(input);

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
  const key = getVapiServerKey();
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
  const key = getVapiServerKey();
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
