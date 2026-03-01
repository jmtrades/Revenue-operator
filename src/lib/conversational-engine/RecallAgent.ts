/**
 * RecallAgent: orchestrator for the conversational engine.
 * Composes Business Brain + Shadow-Prompt + Brain (function calling) + ResiliencyLayer.
 * Telephony (Vapi) remains separate; this layer produces assistant config and tools.
 */

import { compileSystemPrompt } from "@/lib/business-brain/compile";
import { getShadowPrompt } from "./shadow-prompt";
import { loadContextBuffer } from "./context-buffer";
import { cleanTranscript } from "./ResiliencyLayer";
import {
  getBrainToolDefinitions,
  createDefaultBrain,
  type BrainFunctions,
  type BrainConfig,
} from "./Brain";

export interface RecallAgentConfig {
  workspaceId: string;
  leadId?: string | null;
  agentName?: string;
  greeting?: string;
  getDb: () => ReturnType<typeof import("@/lib/db/queries").getDb>;
}

export interface RecallAgentBuildResult {
  systemPrompt: string;
  firstMessage: string;
  tools: Array<{ name: string; description: string; parameters: { type: string; properties: Record<string, unknown> } }>;
}

/**
 * RecallAgent: build assistant config for Vapi (or other telephony) from workspace/lead context.
 * Uses Context Buffer, Business Brain, Shadow-Prompt, and Brain tool definitions.
 * Does not perform STT/TTS; that is the telephony provider's responsibility.
 */
export class RecallAgent {
  private config: RecallAgentConfig;
  private brain: BrainFunctions | null = null;

  constructor(config: RecallAgentConfig) {
    this.config = config;
  }

  /**
   * Load context and Brain, then build system prompt and tools. Call once per call/session.
   */
  async build(): Promise<RecallAgentBuildResult> {
    const { getDb } = this.config;
    const buffer = await loadContextBuffer(
      { workspaceId: this.config.workspaceId, leadId: this.config.leadId },
      getDb
    );

    const businessInput = buffer.business ?? {
      business_name: "the business",
      agent_name: this.config.agentName ?? "Sarah",
      greeting: this.config.greeting,
    };
    if (this.config.agentName) businessInput.agent_name = this.config.agentName;
    if (this.config.greeting) businessInput.greeting = this.config.greeting;

    const basePrompt = compileSystemPrompt(businessInput);
    const shadow = getShadowPrompt();
    const systemPrompt = `${basePrompt}\n\n${shadow}`;

    this.brain = await createDefaultBrain(getDb);
    const tools = getBrainToolDefinitions();

    const firstMessage =
      this.config.greeting?.trim() ||
      `Hello, this is ${businessInput.agent_name ?? "the receptionist"}. How can I help you today?`;

    return {
      systemPrompt,
      firstMessage,
      tools,
    };
  }

  /**
   * Run a Brain function by name (for server-side tool execution when LLM requests it).
   */
  async runBrainFunction(
    name: string,
    params: Record<string, unknown>
  ): Promise<{ ok: boolean; result?: unknown; message?: string }> {
    const brain = this.brain;
    if (!brain) {
      return { ok: false, message: "Brain not initialized; call build() first." };
    }
    const config: BrainConfig = {
      workspaceId: this.config.workspaceId,
      leadId: this.config.leadId ?? undefined,
    };
    switch (name) {
      case "check_availability": {
        const r = await brain.checkAvailability(config, params as { date?: string; service?: string });
        return { ok: r.ok, result: r.slots, message: r.message };
      }
      case "get_booking_link": {
        const r = await brain.getBookingLink(config);
        return { ok: r.ok, result: r.url, message: r.message };
      }
      case "record_commitment_intent": {
        const r = await brain.recordCommitmentIntent(config, { intent: String(params.intent ?? "book") });
        return { ok: r.ok, message: r.message };
      }
      default:
        return { ok: false, message: "Unknown tool." };
    }
  }

  /**
   * Apply ResiliencyLayer to raw transcript before passing to state machine or LLM.
   */
  cleanTranscript(raw: string): ReturnType<typeof cleanTranscript> {
    return cleanTranscript(raw);
  }
}
