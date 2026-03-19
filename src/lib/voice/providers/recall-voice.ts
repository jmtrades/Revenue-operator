import type {
  VoiceProvider,
  CreateAssistantParams,
  CreateCallParams,
  CallResult,
  WebhookEvent,
} from "../types";
import { HUMAN_VOICE_DEFAULTS } from "@/lib/voice/human-voice-defaults";
import { log } from "@/lib/logger";

function getVoiceServerUrl(): string {
  const url = process.env.VOICE_SERVER_URL;
  if (!url) {
    console.warn(
      "VOICE_SERVER_URL not set, using default http://localhost:8100. " +
      "Set VOICE_SERVER_URL to your self-hosted voice server."
    );
    return "http://localhost:8100";
  }
  return url;
}

interface RecallAssistantConfig {
  id: string;
  name: string;
  system_prompt: string;
  voice_id: string;
  voice_model_config?: {
    pitch_shift?: number;
    speed?: number;
    stability?: number;
    style?: number;
    warmth?: number;
  };
  stt_enabled?: boolean;
  tool_calling_enabled?: boolean;
  backchannel_enabled?: boolean;
  silence_timeout_ms?: number;
  metadata?: Record<string, string>;
}

/**
 * Self-hosted voice synthesis provider.
 * Replaces ElevenLabs with a local voice server.
 */
export class RecallVoiceProvider implements VoiceProvider {
  private assistantConfigs: Map<string, RecallAssistantConfig> = new Map();
  private serverUrl: string;

  constructor() {
    this.serverUrl = getVoiceServerUrl();
  }

  async createAssistant(params: CreateAssistantParams): Promise<{ assistantId: string }> {
    const assistantId = `assistant_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`;

    const config: RecallAssistantConfig = {
      id: assistantId,
      name: params.name,
      system_prompt: params.systemPrompt,
      voice_id: params.voiceId,
      voice_model_config: {
        pitch_shift: 0,
        speed: HUMAN_VOICE_DEFAULTS.speed,
        stability: HUMAN_VOICE_DEFAULTS.stability,
        style: HUMAN_VOICE_DEFAULTS.style,
        warmth: 0.5,
      },
      stt_enabled: true,
      tool_calling_enabled: params.tools && params.tools.length > 0,
      backchannel_enabled: HUMAN_VOICE_DEFAULTS.backchannel,
      silence_timeout_ms: (params.silenceTimeout ?? 30) * 1000,
      metadata: params.metadata ?? {},
    };

    this.assistantConfigs.set(assistantId, config);

    // Verify voice exists on server
    try {
      const voiceResponse = await fetch(`${this.serverUrl}/voices/${params.voiceId}`);
      if (!voiceResponse.ok) {
        throw new Error(
          `Voice ${params.voiceId} not found on voice server. ` +
          `Available voices can be retrieved from ${this.serverUrl}/voices`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to verify voice on server: ${error.message}. ` +
          `Is the voice server running at ${this.serverUrl}?`
        );
      }
      throw error;
    }

    log("info", "recall_voice.assistant_created", { assistantId, voiceId: params.voiceId });
    return { assistantId };
  }

  async updateAssistant(
    assistantId: string,
    params: Partial<CreateAssistantParams>
  ): Promise<void> {
    const config = this.assistantConfigs.get(assistantId);
    if (!config) {
      throw new Error(`Assistant ${assistantId} not found`);
    }

    if (params.name) config.name = params.name;
    if (params.systemPrompt) config.system_prompt = params.systemPrompt;
    if (params.voiceId) config.voice_id = params.voiceId;
    if (params.silenceTimeout) config.silence_timeout_ms = params.silenceTimeout * 1000;
    if (params.metadata) config.metadata = params.metadata;

    this.assistantConfigs.set(assistantId, config);
    log("info", "recall_voice.assistant_updated", { assistantId });
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    if (!this.assistantConfigs.has(assistantId)) {
      throw new Error(`Assistant ${assistantId} not found`);
    }
    this.assistantConfigs.delete(assistantId);
    log("info", "recall_voice.assistant_deleted", { assistantId });
  }

  async createOutboundCall(params: CreateCallParams): Promise<CallResult> {
    const config = this.assistantConfigs.get(params.assistantId);
    if (!config) {
      throw new Error(`Assistant ${params.assistantId} not found`);
    }

    const callId = `call_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`;

    // Place outbound call via Twilio, streaming audio to our voice server
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioSid || !twilioAuth || !twilioPhone) {
      console.warn("Twilio credentials not configured — outbound call queued but not placed");
      return { callId, status: "queued", provider: "recall" };
    }

    const wsUrl = this.serverUrl.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
    const escXml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escXml(wsUrl)}/ws/conversation">
      <Parameter name="assistant_id" value="${escXml(params.assistantId)}" />
      <Parameter name="voice_id" value="${escXml(config.voice_id)}" />
      <Parameter name="direction" value="outbound" />
    </Stream>
  </Connect>
</Response>`;

    try {
      const authHeader = Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64");
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authHeader}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: params.phoneNumber,
            From: twilioPhone,
            Twiml: twiml,
          }),
        },
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Twilio API error: ${response.status} ${err}`);
      }

      const data = await response.json() as { sid: string };
      log("info", "recall_voice.outbound_call_placed", { callSid: data.sid });

      return {
        callId: data.sid,
        status: "queued",
        provider: "recall",
      };
    } catch (error) {
      console.error("Outbound call failed:", error);
      return { callId, status: "failed", provider: "recall" };
    }
  }

  async createInboundCall(twilioCallSid: string, assistantId: string): Promise<string> {
    const config = this.assistantConfigs.get(assistantId);
    if (!config) {
      throw new Error(`Assistant ${assistantId} not found`);
    }

    // Return TwiML that streams to our voice server WebSocket instead of ElevenLabs
    // The voice server will handle STT, LLM, and TTS
    const wsUrl = this.serverUrl.replace(/^https:/, "wss:").replace(/^http:/, "ws:");

    // Escape XML special characters to prevent injection
    const escXml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escXml(wsUrl)}/ws/conversation">
      <Parameter name="call_sid" value="${escXml(twilioCallSid)}" />
      <Parameter name="assistant_id" value="${escXml(assistantId)}" />
    </Stream>
  </Connect>
</Response>`;

    log("info", "recall_voice.inbound_twiml_created", { callSid: twilioCallSid });

    return twiml;
  }

  parseWebhookEvent(body: unknown): WebhookEvent {
    const data = body as Record<string, unknown>;
    const eventType = data.type as string | undefined;

    // Base event with conversation_id or callId
    const base: WebhookEvent = {
      type: "call-started",
      callId: (data.conversation_id as string) || (data.callId as string) || "",
      metadata: (data.metadata as Record<string, string>) ?? undefined,
    };

    if (!eventType) return base;

    // Handle different event types from our voice server
    if (
      eventType === "conversation.started" ||
      eventType === "conversation_started"
    ) {
      return base;
    }

    if (
      eventType === "conversation.tool_call" ||
      eventType === "tool_call"
    ) {
      const toolCall = data.tool_call as
        | { name?: string; parameters?: Record<string, unknown> }
        | undefined;
      return {
        ...base,
        type: "tool-call",
        toolName: toolCall?.name,
        toolArgs: toolCall?.parameters,
      };
    }

    if (
      eventType === "conversation.ended" ||
      eventType === "conversation_ended"
    ) {
      return {
        ...base,
        type: "end-of-call",
        transcript: data.transcript as string | undefined,
        summary: data.summary as string | undefined,
        recordingUrl: data.recording_url as string | undefined,
        duration: data.duration_seconds as number | undefined,
      };
    }

    if (eventType === "error") {
      return {
        ...base,
        type: "error",
        error: (data.error as string) ?? (data.message as string) ?? "Unknown error",
      };
    }

    return base;
  }
}
