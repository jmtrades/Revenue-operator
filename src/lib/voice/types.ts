export interface VoiceProviderConfig {
  provider: "recall" | "pipecat";
  apiKey: string;
  phoneNumberId?: string;
  publicKey?: string;
}

/**
 * Voice stack configuration — controls which TTS, STT, LLM, and orchestration
 * providers are used. This is the single place to swap providers for cost optimization.
 *
 * Cost targets (per minute):
 *   Phase 1.5: $0.074 (Recall self-hosted + Deepgram TTS + Claude Haiku)
 *   Phase 2: $0.058 (replace Recall with Pipecat)
 *   Phase 3: $0.043 (Cartesia TTS + GPT-4o-mini routing)
 */
export type TtsProvider = "deepgram-aura" | "cartesia" | "recall-self-hosted";
export type SttProvider = "deepgram";
export type LlmProvider = "claude-sonnet" | "claude-haiku" | "gpt-4o-mini";
export type OrchestrationProvider = "recall" | "pipecat";

export interface VoiceStackConfig {
  orchestration: OrchestrationProvider;
  tts: {
    standard: TtsProvider; // Default for all calls
    premium: TtsProvider; // Premium voices (add-on)
  };
  stt: SttProvider;
  llm: {
    routine: LlmProvider; // Booking, FAQ, routing (~80% of calls)
    complex: LlmProvider; // Complaints, negotiation, complex intake (~20%)
  };
  /** Estimated blended COGS per minute in cents */
  estimatedCogsCentsPerMin: number;
}

/** Current active voice stack — update this as we migrate through phases */
export const ACTIVE_VOICE_STACK: VoiceStackConfig = {
  // PHASE 1.5: Recall self-hosted voice server
  orchestration: "recall",
  tts: {
    standard: "deepgram-aura", // $0.022/min
    premium: "deepgram-aura", // Use Deepgram for all for now
  },
  stt: "deepgram",
  llm: {
    routine: "claude-haiku", // $0.009/min
    complex: "claude-sonnet", // Keep Sonnet for complex calls
  },
  estimatedCogsCentsPerMin: 8, // $0.074/min (Recall ~$0.043 + Deepgram $0.022 + Claude Haiku $0.009)
};

/**
 * Phase 2 config (uncomment when Pipecat is ready):
 *
 * export const ACTIVE_VOICE_STACK: VoiceStackConfig = {
 *   orchestration: "pipecat",
 *   tts: { standard: "deepgram-aura", premium: "deepgram-aura" },
 *   stt: "deepgram",
 *   llm: { routine: "claude-haiku", complex: "claude-sonnet" },
 *   estimatedCogsCentsPerMin: 6, // $0.058/min
 * };
 */

export interface CreateAssistantParams {
  name: string;
  systemPrompt: string;
  firstMessage?: string;
  voiceId: string;
  voiceProvider: "elevenlabs" | "deepgram" | "deepgram-aura" | "cartesia" | "playht";
  voiceModel?: string;
  language?: string;
  sttModel?: string;
  sttProvider?: string;
  tools?: AssistantTool[];
  maxDuration?: number;
  silenceTimeout?: number;
  backgroundDenoising?: boolean;
  metadata?: Record<string, string>;
}

export interface AssistantTool {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface CreateCallParams {
  assistantId: string;
  phoneNumber: string;
  fromNumber?: string;
  metadata?: Record<string, string>;
  voicemailBehavior?: "leave_message" | "hangup" | "sms";
  voicemailMessage?: string;
}

export interface CallResult {
  callId: string;
  callSessionId?: string;
  status: "queued" | "ringing" | "in-progress" | "completed" | "failed";
  provider: string;
}

export interface WebhookEvent {
  type: "call-started" | "tool-call" | "end-of-call" | "transcript" | "error";
  callId: string;
  metadata?: Record<string, string>;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  duration?: number;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  error?: string;
}

export interface VoiceProvider {
  createAssistant(params: CreateAssistantParams): Promise<{ assistantId: string }>;
  updateAssistant(assistantId: string, params: Partial<CreateAssistantParams>): Promise<void>;
  deleteAssistant(assistantId: string): Promise<void>;
  createOutboundCall(params: CreateCallParams): Promise<CallResult>;
  createInboundCall(twilioCallSid: string, assistantId: string): Promise<string>;
  parseWebhookEvent(body: unknown): WebhookEvent;
}

