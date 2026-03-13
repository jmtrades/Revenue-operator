export interface VoiceProviderConfig {
  provider: "vapi" | "retell" | "bland" | "custom";
  apiKey: string;
  phoneNumberId?: string;
  publicKey?: string;
}

export interface CreateAssistantParams {
  name: string;
  systemPrompt: string;
  voiceId: string;
  voiceProvider: "elevenlabs" | "deepgram" | "playht";
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
  status: "queued" | "ringing" | "in-progress" | "completed" | "failed";
  provider: string;
}

export interface WebhookEvent {
  type: "call-started" | "tool-call" | "end-of-call" | "transcript";
  callId: string;
  metadata?: Record<string, string>;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  duration?: number;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

export interface VoiceProvider {
  createAssistant(params: CreateAssistantParams): Promise<{ assistantId: string }>;
  updateAssistant(assistantId: string, params: Partial<CreateAssistantParams>): Promise<void>;
  deleteAssistant(assistantId: string): Promise<void>;
  createOutboundCall(params: CreateCallParams): Promise<CallResult>;
  createInboundCall(twilioCallSid: string, assistantId: string): Promise<string>;
  parseWebhookEvent(body: unknown): WebhookEvent;
}

