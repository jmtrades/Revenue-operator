import type {
  VoiceProvider,
  CreateAssistantParams,
  CreateCallParams,
  CallResult,
  WebhookEvent,
} from "../types";
import {
  HUMAN_VOICE_DEFAULTS,
  PHONE_LINE_OPTIMIZATION,
  HUMAN_IMPERFECTION_SETTINGS,
  DYNAMIC_RESPONSE_LATENCY,
  INTERRUPTION_ACKNOWLEDGMENT,
  FILLER_ROTATION,
} from "@/lib/voice/human-voice-defaults";
import { buildSTTVocabulary, formatForDeepgram } from "@/lib/voice/stt-vocabulary";
import { applyPronunciationRules, COMMON_PRONUNCIATION_FIXES, type PronunciationEntry } from "@/lib/voice/pronunciation";
import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";

function getVoiceServerUrl(): string {
  const url = process.env.VOICE_SERVER_URL || process.env.NEXT_PUBLIC_VOICE_SERVER_URL;
  if (!url) {
    throw new Error("VOICE_SERVER_URL or NEXT_PUBLIC_VOICE_SERVER_URL is required");
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
  /** Dynamic response latency tiers */
  response_latency?: {
    instant: { min_ms: number; max_ms: number };
    normal: { min_ms: number; max_ms: number };
    thoughtful: { min_ms: number; max_ms: number };
  };
  /** Interruption handling config */
  interruption_config?: {
    enabled: boolean;
    stop_latency_ms: number;
    barge_in_threshold_ms: number;
    barge_in_min_words: number;
    acknowledgment_phrases: Record<string, string[]>;
  };
  /** Phone-line audio optimization */
  phone_optimization?: {
    output_sample_rate: number;
    telephony_eq: boolean;
    dynamic_range_compression: number;
    de_esser_strength: number;
    low_end_boost_db: number;
  };
  /** Human imperfection injection */
  imperfections?: {
    micro_pause_range_ms: readonly [number, number];
    pitch_variation_semitones: number;
    thinking_sounds: boolean;
    list_cadence_acceleration: boolean;
    important_word_emphasis: boolean;
    sentence_start_breath: boolean;
    self_correction: boolean;
    question_intonation_rise: boolean;
    name_emphasis: boolean;
    conversational_transitions: boolean;
  };
  /** Filler word rotation */
  filler_rotation?: {
    acknowledgments: string[];
    transitions: string[];
    closers: string[];
    lookback_turns: number;
  };
  /** STT keyword boost list for Deepgram */
  stt_keywords?: string[];
  /** Pronunciation dictionary for TTS preprocessing */
  pronunciation_dictionary?: PronunciationEntry[];
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

  /**
   * Preprocess text through the pronunciation dictionary before TTS.
   * Called by the voice server before every speech synthesis.
   */
  preprocessTTSText(assistantId: string, text: string): string {
    const config = this.assistantConfigs.get(assistantId);
    if (!config) return text;

    const dictionary = config.pronunciation_dictionary ?? COMMON_PRONUNCIATION_FIXES;
    return applyPronunciationRules(text, dictionary);
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
        warmth: HUMAN_VOICE_DEFAULTS.warmth,
      },
      stt_enabled: true,
      tool_calling_enabled: !!(params.tools && params.tools.length > 0),
      backchannel_enabled: HUMAN_VOICE_DEFAULTS.backchannel,
      silence_timeout_ms: (params.silenceTimeout ?? 30) * 1000,
      response_latency: {
        instant: { min_ms: DYNAMIC_RESPONSE_LATENCY.instant.minMs, max_ms: DYNAMIC_RESPONSE_LATENCY.instant.maxMs },
        normal: { min_ms: DYNAMIC_RESPONSE_LATENCY.normal.minMs, max_ms: DYNAMIC_RESPONSE_LATENCY.normal.maxMs },
        thoughtful: { min_ms: DYNAMIC_RESPONSE_LATENCY.thoughtful.minMs, max_ms: DYNAMIC_RESPONSE_LATENCY.thoughtful.maxMs },
      },
      interruption_config: {
        enabled: INTERRUPTION_ACKNOWLEDGMENT.enabled,
        stop_latency_ms: INTERRUPTION_ACKNOWLEDGMENT.stopLatencyMs,
        barge_in_threshold_ms: INTERRUPTION_ACKNOWLEDGMENT.bargeInThresholdMs,
        barge_in_min_words: INTERRUPTION_ACKNOWLEDGMENT.bargeInMinWords,
        acknowledgment_phrases: {
          redirect: [...INTERRUPTION_ACKNOWLEDGMENT.phrases.redirect],
          confirmation: [...INTERRUPTION_ACKNOWLEDGMENT.phrases.confirmation],
          hold_request: [...INTERRUPTION_ACKNOWLEDGMENT.phrases.holdRequest],
          generic: [...INTERRUPTION_ACKNOWLEDGMENT.phrases.generic],
        },
      },
      phone_optimization: {
        output_sample_rate: PHONE_LINE_OPTIMIZATION.outputSampleRate,
        telephony_eq: PHONE_LINE_OPTIMIZATION.telephonyEqEnabled,
        dynamic_range_compression: PHONE_LINE_OPTIMIZATION.dynamicRangeCompression,
        de_esser_strength: PHONE_LINE_OPTIMIZATION.deEsserStrength,
        low_end_boost_db: PHONE_LINE_OPTIMIZATION.lowEndBoostDb,
      },
      imperfections: {
        micro_pause_range_ms: HUMAN_IMPERFECTION_SETTINGS.microPauseRange,
        pitch_variation_semitones: HUMAN_IMPERFECTION_SETTINGS.pitchVariationSemitones,
        thinking_sounds: HUMAN_IMPERFECTION_SETTINGS.thinkingSoundsEnabled,
        list_cadence_acceleration: HUMAN_IMPERFECTION_SETTINGS.listCadenceAcceleration,
        important_word_emphasis: HUMAN_IMPERFECTION_SETTINGS.importantWordEmphasis,
        sentence_start_breath: HUMAN_IMPERFECTION_SETTINGS.sentenceStartBreath,
        self_correction: HUMAN_IMPERFECTION_SETTINGS.occasionalSelfCorrection,
        question_intonation_rise: HUMAN_IMPERFECTION_SETTINGS.questionIntonationRise,
        name_emphasis: HUMAN_IMPERFECTION_SETTINGS.nameEmphasis,
        conversational_transitions: HUMAN_IMPERFECTION_SETTINGS.conversationalTransitions,
      },
      filler_rotation: {
        acknowledgments: [...FILLER_ROTATION.acknowledgments],
        transitions: [...FILLER_ROTATION.transitions],
        closers: [...FILLER_ROTATION.closers],
        lookback_turns: FILLER_ROTATION.lookbackTurns,
      },
      metadata: params.metadata ?? {},
    };

    // Build STT vocabulary boost from workspace context (if metadata provides it)
    const meta = params.metadata ?? {};
    if (meta.business_name || meta.industry) {
      const sttKeywords = buildSTTVocabulary({
        businessName: meta.business_name ?? "",
        staffNames: meta.staff_names ? meta.staff_names.split(",") : undefined,
        services: meta.services ? meta.services.split(",") : undefined,
        address: meta.address,
        industry: meta.industry,
        customTerms: meta.custom_terms ? meta.custom_terms.split(",") : undefined,
      });
      config.stt_keywords = formatForDeepgram(sttKeywords);
    }

    // Build pronunciation dictionary from workspace context
    const pronunciationEntries: PronunciationEntry[] = [...COMMON_PRONUNCIATION_FIXES];
    if (meta.business_name) {
      pronunciationEntries.push({
        word: meta.business_name,
        respelling: meta.business_name_pronunciation ?? meta.business_name,
        category: "business_name",
        caseInsensitive: true,
      });
    }
    config.pronunciation_dictionary = pronunciationEntries;

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

    // Use the unified telephony service (Telnyx or Twilio based on TELEPHONY_PROVIDER)
    try {
      const { getTelephonyService } = await import("@/lib/telephony");
      const telephony = getTelephonyService();

      // Determine the "from" phone number: workspace-specific or fall back to global env var
      let fromPhoneNumber: string | undefined;

      // Check if workspace_id is available in metadata
      const workspaceId = params.metadata?.workspace_id;
      if (workspaceId) {
        const db = getDb();
        const { data: phoneConfig } = await db
          .from("phone_configs")
          .select("proxy_number")
          .eq("workspace_id", workspaceId)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (phoneConfig && (phoneConfig as { proxy_number?: string | null }).proxy_number) {
          fromPhoneNumber = (phoneConfig as { proxy_number: string }).proxy_number;
        }
      }

      // Fall back to global env var if no workspace phone found
      if (!fromPhoneNumber) {
        fromPhoneNumber = process.env.TELNYX_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER;
      }

      if (!fromPhoneNumber) {
        throw new Error("No outbound phone number configured — set workspace phone config or TELNYX_PHONE_NUMBER or TWILIO_PHONE_NUMBER");
      }

      const webhookBase = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
      // Use the correct webhook URL for the active telephony provider
      const { getTelephonyProvider: getProvider } = await import("@/lib/telephony/get-telephony-provider");
      const activeProvider = getProvider();
      const webhookPath = activeProvider === "twilio"
        ? "/api/webhooks/twilio/voice"
        : "/api/webhooks/telnyx/voice";
      const result = await telephony.createOutboundCall({
        to: params.phoneNumber,
        from: fromPhoneNumber,
        webhookUrl: `${webhookBase}${webhookPath}`,
        metadata: {
          assistant_id: params.assistantId,
          voice_id: config.voice_id,
          direction: "outbound",
        },
      });

      if ("error" in result) {
        throw new Error(result.error);
      }

      log("info", "recall_voice.outbound_call_placed", { callId: result.callId });
      return {
        callId: result.callId || callId,
        callSessionId: result.callSessionId,
        status: "queued",
        provider: "recall",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log("error", "recall_voice.outbound_call_failed", { error: errorMsg });
      // Throw so the caller can handle the error with context, rather than silently returning failed
      throw new Error(`Outbound call failed: ${errorMsg}`);
    }
  }

  async createInboundCall(callSessionId: string, assistantId: string): Promise<string> {
    const config = this.assistantConfigs.get(assistantId);
    if (!config) {
      throw new Error(`Assistant ${assistantId} not found`);
    }

    // Return streaming config for voice server WebSocket
    // Works with both Telnyx (Call Control) and Twilio (TwiML) depending on provider
    const wsUrl = this.serverUrl.replace(/^https:/, "wss:").replace(/^http:/, "ws:");

    // Escape XML special characters to prevent injection
    const escXml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    // Return TwiML-compatible streaming response (works as fallback for both providers)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escXml(wsUrl)}/ws/conversation">
      <Parameter name="call_session_id" value="${escXml(callSessionId)}" />
      <Parameter name="assistant_id" value="${escXml(assistantId)}" />
    </Stream>
  </Connect>
</Response>`;

    log("info", "recall_voice.inbound_stream_created", { callSessionId });

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
