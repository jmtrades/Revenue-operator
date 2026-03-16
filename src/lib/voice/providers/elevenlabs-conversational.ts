import type {
  VoiceProvider,
  CreateAssistantParams,
  CreateCallParams,
  CallResult,
  WebhookEvent,
} from "../types";
import { HUMAN_VOICE_DEFAULTS } from "@/lib/voice/human-voice-defaults";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

function getElevenLabsApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

export class ElevenLabsConversationalProvider implements VoiceProvider {
  private headers() {
    return {
      "xi-api-key": getElevenLabsApiKey(),
      "Content-Type": "application/json",
    };
  }

  async createAssistant(params: CreateAssistantParams): Promise<{ assistantId: string }> {
    const body: Record<string, unknown> = {
      name: params.name,
      conversation_config: {
        agent: {
          prompt: {
            prompt: params.systemPrompt,
            llm: "claude-sonnet-4-20250514",
            temperature: 0.45,
            max_tokens: 350,
          },
          first_message: params.metadata?.greeting || "Hello, how can I help you today?",
          language: params.language || "en",
        },
        tts: {
          voice_id: params.voiceId,
          model_id: params.voiceModel || "eleven_turbo_v2_5",
          stability: HUMAN_VOICE_DEFAULTS.stability,
          similarity_boost: HUMAN_VOICE_DEFAULTS.similarityBoost,
          style: HUMAN_VOICE_DEFAULTS.style,
          speed: HUMAN_VOICE_DEFAULTS.speed,
          optimize_streaming_latency: 3,
        },
        stt: {
          provider: params.sttProvider || "deepgram",
          model: params.sttModel || "nova-2",
        },
        turn: {
          silence_timeout_ms: (params.silenceTimeout ?? 30) * 1000,
          max_duration_seconds: params.maxDuration || 600,
        },
      },
      platform_settings: {
        auth: {
          enable_auth: false,
        },
      },
    };

    if (params.tools && params.tools.length > 0) {
      (body.conversation_config as { agent?: Record<string, unknown> }).agent = {
        ...(body.conversation_config as { agent?: Record<string, unknown> }).agent,
        tools: params.tools.map((tool) => ({
          type: "webhook",
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
      };
    }

    const res = await fetch(`${ELEVENLABS_API_BASE}/convai/agents/create`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs createAssistant failed: ${res.status} ${err}`);
    }

    const data = (await res.json()) as { agent_id?: string };
    const assistantId = data.agent_id;
    if (!assistantId) {
      throw new Error("ElevenLabs createAssistant returned no agent_id");
    }
    return { assistantId };
  }

  async updateAssistant(assistantId: string, params: Partial<CreateAssistantParams>): Promise<void> {
    const body: Record<string, unknown> = {};
    if (params.name) body.name = params.name;
    const conversationConfig: Record<string, unknown> = {};

    if (params.systemPrompt || params.language) {
      conversationConfig.agent = {
        ...(params.systemPrompt && {
          prompt: { prompt: params.systemPrompt },
        }),
        ...(params.language && { language: params.language }),
      };
    }
    if (params.voiceId || params.voiceModel) {
      conversationConfig.tts = {
        ...(params.voiceId && { voice_id: params.voiceId }),
        ...(params.voiceModel && { model_id: params.voiceModel }),
      };
    }
    if (params.maxDuration || params.silenceTimeout) {
      conversationConfig.turn = {
        ...(params.maxDuration && { max_duration_seconds: params.maxDuration }),
        ...(params.silenceTimeout && { silence_timeout_ms: params.silenceTimeout * 1000 }),
      };
    }

    if (Object.keys(conversationConfig).length > 0) {
      body.conversation_config = conversationConfig;
    }

    const res = await fetch(`${ELEVENLABS_API_BASE}/convai/agents/${assistantId}`, {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs updateAssistant failed: ${res.status} ${err}`);
    }
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    const res = await fetch(`${ELEVENLABS_API_BASE}/convai/agents/${assistantId}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs deleteAssistant failed: ${res.status} ${err}`);
    }
  }

  async createOutboundCall(params: CreateCallParams): Promise<CallResult> {
    const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
    if (!phoneNumberId) {
      throw new Error("ELEVENLABS_PHONE_NUMBER_ID is not configured — cannot place outbound calls");
    }
    const body: Record<string, unknown> = {
      agent_id: params.assistantId,
      agent_phone_number_id: phoneNumberId,
      to_number: params.phoneNumber,
      metadata: params.metadata ?? {},
    };

    const res = await fetch(`${ELEVENLABS_API_BASE}/convai/twilio/outbound-call`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs outbound call failed: ${res.status} ${err}`);
    }

    const data = (await res.json()) as { call_id?: string; conversation_id?: string };
    return {
      callId: data.call_id ?? data.conversation_id ?? "",
      status: "queued",
      provider: "elevenlabs",
    };
  }

  async createInboundCall(twilioCallSid: string, assistantId: string): Promise<string> {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${assistantId}">
      <Parameter name="call_sid" value="${twilioCallSid}" />
    </Stream>
  </Connect>
</Response>`;
  }

  parseWebhookEvent(body: unknown): WebhookEvent {
    const data = body as Record<string, unknown>;
    const eventType = data.type as string | undefined;
    const base: WebhookEvent = {
      type: "call-started",
      callId: (data.conversation_id as string) || "",
      metadata: (data.metadata as Record<string, string>) ?? undefined,
    };

    if (!eventType) return base;

    if (eventType === "conversation.started") {
      return base;
    }

    if (eventType === "conversation.tool_call") {
      const toolCall = data.tool_call as { name?: string; parameters?: Record<string, unknown> } | undefined;
      return {
        ...base,
        type: "tool-call",
        toolName: toolCall?.name,
        toolArgs: toolCall?.parameters,
      };
    }

    if (eventType === "conversation.ended") {
      return {
        ...base,
        type: "end-of-call",
        transcript: data.transcript as string | undefined,
        summary: data.summary as string | undefined,
        recordingUrl: data.recording_url as string | undefined,
        duration: data.duration_seconds as number | undefined,
      };
    }

    return base;
  }
}

