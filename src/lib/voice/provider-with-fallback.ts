import type {
  VoiceProvider,
  CreateAssistantParams,
  CreateCallParams,
  CallResult,
  WebhookEvent,
} from "./types";
import { log } from "@/lib/logger";

/**
 * Voice provider wrapper that implements automatic fallback.
 *
 * When the primary provider fails or times out (5 seconds), automatically
 * falls back to the secondary provider. Logs all failures.
 *
 * Each method returns the result from whichever provider succeeded.
 */
export class VoiceProviderWithFallback implements VoiceProvider {
  constructor(
    private primary: VoiceProvider,
    private fallback: VoiceProvider,
    private primaryName: string = "primary",
    private fallbackName: string = "fallback",
  ) {}

  private async tryWithFallback<T>(
    operation: string,
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await Promise.race([
        primaryFn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`${this.primaryName} timeout after 5000ms`)),
            5000
          )
        ),
      ]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log("warn", "voice_fallback.primary_failed", {
        primary: this.primaryName,
        fallback: this.fallbackName,
        operation,
        error: errorMsg,
      });
      return fallbackFn();
    }
  }

  async createAssistant(params: CreateAssistantParams): Promise<{ assistantId: string }> {
    return this.tryWithFallback(
      "createAssistant",
      () => this.primary.createAssistant(params),
      () => this.fallback.createAssistant(params),
    );
  }

  async updateAssistant(
    assistantId: string,
    params: Partial<CreateAssistantParams>,
  ): Promise<void> {
    return this.tryWithFallback(
      "updateAssistant",
      () => this.primary.updateAssistant(assistantId, params),
      () => this.fallback.updateAssistant(assistantId, params),
    );
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    return this.tryWithFallback(
      "deleteAssistant",
      () => this.primary.deleteAssistant(assistantId),
      () => this.fallback.deleteAssistant(assistantId),
    );
  }

  async createOutboundCall(params: CreateCallParams): Promise<CallResult> {
    return this.tryWithFallback(
      "createOutboundCall",
      () => this.primary.createOutboundCall(params),
      () => this.fallback.createOutboundCall(params),
    );
  }

  async createInboundCall(twilioCallSid: string, assistantId: string): Promise<string> {
    return this.tryWithFallback(
      "createInboundCall",
      () => this.primary.createInboundCall(twilioCallSid, assistantId),
      () => this.fallback.createInboundCall(twilioCallSid, assistantId),
    );
  }

  parseWebhookEvent(body: unknown): WebhookEvent {
    try {
      return this.primary.parseWebhookEvent(body);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log("warn", "voice_fallback.webhook_parse_failed", {
        primary: this.primaryName,
        fallback: this.fallbackName,
        error: errorMsg,
      });
      return this.fallback.parseWebhookEvent(body);
    }
  }
}
