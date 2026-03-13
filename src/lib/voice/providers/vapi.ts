import {
  AssistantTool,
  CallResult,
  CreateAssistantParams,
  CreateCallParams,
  VoiceProvider,
  WebhookEvent,
} from "../types";
import {
  createAssistant as vapiCreateAssistant,
  updateAssistant as vapiUpdateAssistant,
  createCallForTwilio,
  createOutboundCall as vapiCreateOutboundCall,
} from "@/lib/vapi";

export class VapiProvider implements VoiceProvider {
  async createAssistant(params: CreateAssistantParams): Promise<{ assistantId: string }> {
    const tools =
      params.tools?.map((tool: AssistantTool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })) ?? [];

    const { id } = await vapiCreateAssistant({
      name: params.name,
      systemPrompt: params.systemPrompt,
      firstMessage: `Hello, this is ${params.name}. How can I help you today?`,
      voiceId: params.voiceId,
      language: params.language,
      workspaceId: params.metadata?.workspace_id ?? null,
      toolCalls: tools,
      maxDurationSeconds: params.maxDuration,
      voicemailDetection: undefined,
      voiceSettings: {
        denoising: params.backgroundDenoising,
      },
    } as any);

    return { assistantId: id };
  }

  async updateAssistant(assistantId: string, params: Partial<CreateAssistantParams>): Promise<void> {
    await vapiUpdateAssistant(
      assistantId,
      {
        name: params.name ?? "",
        systemPrompt: params.systemPrompt ?? "",
        firstMessage: `Hello, this is ${params.name ?? "your agent"}. How can I help you today?`,
        voiceId: params.voiceId,
        language: params.language,
        workspaceId: params.metadata?.workspace_id ?? null,
        toolCalls:
          params.tools?.map((tool: AssistantTool) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          })) ?? [],
        maxDurationSeconds: params.maxDuration,
        voicemailDetection: undefined,
        voiceSettings: {
          denoising: params.backgroundDenoising,
        },
      } as any
    );
  }

  async deleteAssistant(_assistantId: string): Promise<void> {
    // Vapi client currently has no delete; no-op for now.
    return;
  }

  async createOutboundCall(params: CreateCallParams): Promise<CallResult> {
    const { callId } = await vapiCreateOutboundCall({
      assistantId: params.assistantId,
      customerNumber: params.phoneNumber,
      metadata: params.metadata ?? {},
    });

    return {
      callId: callId ?? "",
      status: "queued",
      provider: "vapi",
    };
  }

  async createInboundCall(twilioCallSid: string, assistantId: string): Promise<string> {
    const { twiml } = await createCallForTwilio({
      assistantId,
      customerNumber: twilioCallSid,
    });
    return twiml;
  }

  parseWebhookEvent(body: unknown): WebhookEvent {
    const payload = body as
      | {
          type?: string;
          id?: string;
          metadata?: Record<string, string>;
          transcript?: string;
          summary?: string;
          recordingUrl?: string;
          duration?: number;
          tool?: { name?: string; arguments?: Record<string, unknown> };
        }
      | undefined;

    return {
      type: (payload?.type as WebhookEvent["type"]) ?? "call-started",
      callId: payload?.id ?? "",
      metadata: payload?.metadata,
      transcript: payload?.transcript,
      summary: payload?.summary,
      recordingUrl: payload?.recordingUrl,
      duration: payload?.duration,
      toolName: payload?.tool?.name,
      toolArgs: payload?.tool?.arguments,
    };
  }
}

