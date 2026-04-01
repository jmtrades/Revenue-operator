import type {
  VoiceProvider,
  CreateAssistantParams,
  CreateCallParams,
  CallResult,
  WebhookEvent,
} from "../types";
import crypto from "node:crypto";
import { log } from "@/lib/logger";

type PipecatAssistantConfig = {
  assistantId: string;
  name: string;
  systemPrompt: string;
  voiceId: string;
  metadata: Record<string, unknown> | undefined;
};

function getPipecatServerBaseUrl(): string | null {
  return process.env.PIPECAT_SERVER_URL?.trim() || null;
}

function toWsUrl(baseUrl: string): string {
  // Accept either http(s):// or ws(s)://.
  if (baseUrl.startsWith("ws://") || baseUrl.startsWith("wss://")) return baseUrl;
  if (baseUrl.startsWith("https://")) return baseUrl.replace(/^https:\/\//, "wss://");
  if (baseUrl.startsWith("http://")) return baseUrl.replace(/^http:\/\//, "ws://");
  return baseUrl;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Pipecat VoiceProvider (Phase 2 — orchestration swap).
 *
 * This provider only swaps the orchestration layer; it returns TwiML that streams
 * Twilio Media Streams audio into `services/voice/pipecat-server.py`.
 */
export class PipecatVoiceProvider implements VoiceProvider {
  private serverUrl: string;
  private assistants = new Map<string, PipecatAssistantConfig>();

  constructor() {
    const base = getPipecatServerBaseUrl();
    if (!base) {
      // Keep constructor side-effect-free; errors will surface when we actually create calls.
      this.serverUrl = "";
      return;
    }
    this.serverUrl = toWsUrl(base).replace(/\/$/, "");
  }

  private requireServerUrl(): string {
    if (!this.serverUrl) {
      throw new Error("PIPECAT_SERVER_URL not set");
    }
    return this.serverUrl;
  }

  async createAssistant(params: CreateAssistantParams): Promise<{ assistantId: string }> {
    const assistantId = `pipecat_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`;
    this.assistants.set(assistantId, {
      assistantId,
      name: params.name,
      systemPrompt: params.systemPrompt,
      voiceId: params.voiceId,
      metadata: params.metadata,
    });
    return { assistantId };
  }

  async updateAssistant(assistantId: string, params: Partial<CreateAssistantParams>): Promise<void> {
    const existing = this.assistants.get(assistantId);
    if (!existing) throw new Error(`Assistant ${assistantId} not found`);

    this.assistants.set(assistantId, {
      ...existing,
      name: params.name ?? existing.name,
      systemPrompt: params.systemPrompt ?? existing.systemPrompt,
      voiceId: params.voiceId ?? existing.voiceId,
      metadata: params.metadata ?? existing.metadata,
    });
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    this.assistants.delete(assistantId);
  }

  async createOutboundCall(params: CreateCallParams): Promise<CallResult> {
    const assistant = this.assistants.get(params.assistantId);
    if (!assistant) throw new Error(`Assistant ${params.assistantId} not found`);

    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioPhone) {
      console.warn("Twilio phone number not configured — outbound call queued but not placed");
      return {
        callId: `call_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`,
        status: "queued",
        provider: "pipecat",
      };
    }

    const serverWsBase = this.requireServerUrl();

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(`${serverWsBase}/ws/conversation`)}">
      <Parameter name="assistant_id" value="${escapeXml(params.assistantId)}" />
      <Parameter name="system_prompt" value="${escapeXml(assistant.systemPrompt)}" />
      <Parameter name="voice_id" value="${escapeXml(assistant.voiceId)}" />
      ${params.metadata?.["call_session_id"] ? `<Parameter name="call_session_id" value="${escapeXml(String(params.metadata["call_session_id"]))}" />` : ""}
      ${params.metadata?.["lead_id"] ? `<Parameter name="lead_id" value="${escapeXml(String(params.metadata["lead_id"]))}" />` : ""}
      ${params.metadata?.["workspace_id"] ? `<Parameter name="workspace_id" value="${escapeXml(String(params.metadata["workspace_id"]))}" />` : ""}
    </Stream>
  </Connect>
</Response>`;

    const callId = `outbound_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`;
    try {
      const { getTelephonyService } = await import("@/lib/telephony");
      const telephony = getTelephonyService();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
      if (!appUrl) {
        throw new Error("NEXT_PUBLIC_APP_URL or VERCEL_URL is required for webhooks");
      }
      const result = await telephony.createOutboundCall({
        from: twilioPhone,
        to: params.phoneNumber,
        webhookUrl: `${appUrl}/api/inbound/post-call`,
        metadata: params.metadata,
      });

      if ("error" in result) {
        throw new Error(result.error);
      }

      return { callId: result.callId ?? callId, status: "queued", provider: "pipecat" };
    } catch (err) {
      log("error", "Outbound call failed", { error: err instanceof Error ? err.message : String(err) });
      return { callId, status: "failed", provider: "pipecat" };
    }
  }

  async createInboundCall(twilioCallSid: string, assistantId: string): Promise<string> {
    const assistant = this.assistants.get(assistantId);
    if (!assistant) throw new Error(`Assistant ${assistantId} not found`);

    const serverWsBase = this.requireServerUrl();

    // Twilio passes CallSid via its Start message; we only need to return TwiML Connect/Stream.
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapeXml(`${serverWsBase}/ws/conversation`)}">
      <Parameter name="assistant_id" value="${escapeXml(assistantId)}" />
      <Parameter name="system_prompt" value="${escapeXml(assistant.systemPrompt)}" />
      <Parameter name="voice_id" value="${escapeXml(assistant.voiceId)}" />
      ${assistant.metadata?.["workspace_id"] ? `<Parameter name="workspace_id" value="${escapeXml(String(assistant.metadata["workspace_id"]))}" />` : ""}
      <Parameter name="call_sid" value="${escapeXml(twilioCallSid)}" />
    </Stream>
  </Connect>
</Response>`;
  }

  parseWebhookEvent(body: unknown): WebhookEvent {
    const data = body as Record<string, unknown>;
    const type = (data.type as string | undefined) ?? "error";
    const callId = (data.callId as string | undefined) ?? (data.conversation_id as string | undefined) ?? "";
    const metadata = (data.metadata as Record<string, string> | undefined) ?? undefined;

    if (type === "conversation.tool_call" || type === "tool_call") {
      const toolCall = data.tool_call as { name?: string; parameters?: Record<string, unknown> } | undefined;
      return {
        type: "tool-call",
        callId,
        metadata,
        toolName: toolCall?.name,
        toolArgs: toolCall?.parameters,
      };
    }

    if (type === "conversation.ended" || type === "conversation_ended" || type === "end-of-call") {
      return {
        type: "end-of-call",
        callId,
        metadata,
        transcript: data.transcript as string | undefined,
        summary: data.summary as string | undefined,
        recordingUrl: data.recording_url as string | undefined,
        duration: data.duration_seconds as number | undefined,
      };
    }

    if (type === "error") {
      return {
        type: "error",
        callId,
        metadata,
        error: (data.error as string | undefined) ?? (data.message as string | undefined) ?? "Unknown error",
      };
    }

    return { type: "call-started", callId, metadata };
  }
}

