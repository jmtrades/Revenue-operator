/**
 * Conversation State Resolver
 * Maps inbound messages to conversational situations.
 * Returns state classification only - NO reply generation.
 * Decision engine receives ONLY the state, not raw message content.
 */

import OpenAI from "openai";

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is required for AI features");
  }
  return new OpenAI({ apiKey: key });
}

export type ConversationState =
  | "NEW_INTEREST"
  | "CLARIFICATION"
  | "CONSIDERING"
  | "SOFT_OBJECTION"
  | "HARD_OBJECTION"
  | "DRIFT"
  | "COMMITMENT"
  | "POST_BOOKING"
  | "NO_SHOW"
  | "COLD";

export interface ConversationStateResult {
  state: ConversationState;
  confidence: number; // 0-1
  reasoning_tags: string[]; // Detected signals
}

interface ConversationContext {
  message: string;
  previous_messages?: Array<{ role: "user" | "assistant"; content: string; created_at: string }>;
  conversation_age_hours?: number;
  has_previous_engagement?: boolean;
  last_reply_hours_ago?: number;
  call_scheduled?: boolean;
  call_in_future_hours?: number;
}

/**
 * Resolve conversation state from message content and context.
 * Uses LLM for classification but returns deterministic structured output.
 */
export async function resolveConversationState(
  context: ConversationContext
): Promise<ConversationStateResult> {
  const {
    message,
    previous_messages = [],
    conversation_age_hours = 0,
    has_previous_engagement = false,
    last_reply_hours_ago,
    call_scheduled = false,
    call_in_future_hours,
  } = context;

  // Rule-based pre-classification for deterministic cases
  const messageLower = message.toLowerCase().trim();

  // COLD: Very long silence (e.g. 7+ days), re-engagement context
  if (has_previous_engagement && last_reply_hours_ago !== undefined && last_reply_hours_ago >= 24 * 7) {
    return {
      state: "COLD",
      confidence: 0.85,
      reasoning_tags: ["long_silence", "reactivation"],
    };
  }

  // NO_SHOW: Explicit no-show mention or post-appointment no-show signal
  if (/(no.?show|didn't show|didnt show|missed (the )?appointment|wasn't there|werent there)/i.test(messageLower)) {
    return {
      state: "NO_SHOW",
      confidence: 0.9,
      reasoning_tags: ["no_show_signal"],
    };
  }

  // DRIFT: No reply after previous engagement OR very short disengaged responses
  if (has_previous_engagement && last_reply_hours_ago !== undefined && last_reply_hours_ago > 48) {
    if (messageLower.length < 10 || /^(ok|k|thanks|thx|sure|yep|nope)$/i.test(messageLower)) {
      return {
        state: "DRIFT",
        confidence: 0.85,
        reasoning_tags: ["long_silence", "minimal_response"],
      };
    }
  }

  // POST_BOOKING: Call scheduled but attendance uncertain
  if (call_scheduled && call_in_future_hours !== undefined && call_in_future_hours > 0 && call_in_future_hours < 48) {
    const confirmationSignals = /(confirm|attending|be there|see you|yes|sure)/i.test(messageLower);
    const rescheduleSignals = /(reschedule|cancel|can't|can not|wont|won't|change|move)/i.test(messageLower);
    
    if (rescheduleSignals) {
      return {
        state: "POST_BOOKING",
        confidence: 0.9,
        reasoning_tags: ["reschedule_request", "attendance_risk"],
      };
    }
    if (!confirmationSignals && messageLower.length > 5) {
      return {
        state: "POST_BOOKING",
        confidence: 0.7,
        reasoning_tags: ["unconfirmed_attendance"],
      };
    }
  }

  // COMMITMENT: Booking intent or asks how to proceed
  const commitmentSignals = /(schedule|book|call|meeting|when|how do|next step|proceed|sign up|get started)/i.test(messageLower);
  if (commitmentSignals && !/(later|maybe|think|consider)/i.test(messageLower)) {
    return {
      state: "COMMITMENT",
      confidence: 0.8,
      reasoning_tags: ["booking_intent", "proceed_request"],
    };
  }

  // HARD_OBJECTION: Price resistance, distrust, rejection
  const hardObjectionSignals = [
    /(too expensive|too much|cost|price|pricing|budget|afford)/i.test(messageLower),
    /(don't trust|scam|spam|not interested|no thanks|stop)/i.test(messageLower),
    /(waste of time|not worth|not for me)/i.test(messageLower),
  ];
  if (hardObjectionSignals.some(Boolean)) {
    return {
      state: "HARD_OBJECTION",
      confidence: 0.85,
      reasoning_tags: ["price_resistance", "distrust", "rejection"],
    };
  }

  // SOFT_OBJECTION: Delay phrases, "later", "busy", "not sure yet"
  const softObjectionSignals = [
    /(later|not now|busy|maybe|think about|consider|not sure|need to think)/i.test(messageLower),
    /(sometime|eventually|in the future)/i.test(messageLower),
  ];
  if (softObjectionSignals.some(Boolean)) {
    return {
      state: "SOFT_OBJECTION",
      confidence: 0.8,
      reasoning_tags: ["delay_phrase", "timing_hesitation"],
    };
  }

  // CONSIDERING: Comparison language, "thinking about it", evaluating
  const consideringSignals = [
    /(compare|vs|versus|alternative|other option|looking at)/i.test(messageLower),
    /(thinking|evaluating|deciding|weighing)/i.test(messageLower),
  ];
  if (consideringSignals.some(Boolean)) {
    return {
      state: "CONSIDERING",
      confidence: 0.75,
      reasoning_tags: ["comparison_language", "evaluation_mode"],
    };
  }

  // CLARIFICATION: Asking specific details to understand
  const clarificationSignals = [
    /(what|how|why|when|where|who|which|tell me|explain|more about)/i.test(messageLower),
    /\?/.test(messageLower) && messageLower.length > 10,
  ];
  if (clarificationSignals.some(Boolean) && !commitmentSignals) {
    return {
      state: "CLARIFICATION",
      confidence: 0.8,
      reasoning_tags: ["question_asked", "detail_request"],
    };
  }

  // NEW_INTEREST: First contact, generic inquiry, "how does it work"
  if (previous_messages.length === 0 || conversation_age_hours < 1) {
    const newInterestSignals = [
      /(hi|hello|hey|interested|tell me|info|information)/i.test(messageLower),
      /(how does|how do|what is|what's)/i.test(messageLower),
    ];
    if (newInterestSignals.some(Boolean) || messageLower.length < 50) {
      return {
        state: "NEW_INTEREST",
        confidence: 0.85,
        reasoning_tags: ["first_contact", "generic_inquiry"],
      };
    }
  }

  // Fallback: Use LLM for ambiguous cases
  return await classifyWithLLM(context);
}

/**
 * LLM-based classification for ambiguous cases.
 * Returns deterministic structured output.
 */
async function classifyWithLLM(context: ConversationContext): Promise<ConversationStateResult> {
  const { message, previous_messages = [], call_scheduled = false } = context;

  const openai = getOpenAI();
  
  const conversationHistory = previous_messages
    .slice(-3) // Last 3 messages for context
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const systemPrompt = `You are a conversation state classifier. Classify the user's message into ONE of these states:

NEW_INTEREST: first contact, generic inquiry
CLARIFICATION: asking specific details
CONSIDERING: comparison, "thinking about it"
SOFT_OBJECTION: delay phrases, "later", "busy"
HARD_OBJECTION: price resistance, distrust, rejection
DRIFT: no reply after engagement or short disengaged responses
COMMITMENT: booking intent, how to proceed
POST_BOOKING: call scheduled but attendance uncertain
NO_SHOW: missed appointment, didn't show
COLD: very long silence, reactivation

Return JSON only:
{
  "state": "one_of_the_10_states",
  "confidence": 0.0-1.0,
  "reasoning_tags": ["tag1", "tag2"]
}

Be deterministic. Use high confidence (0.8+) when clear, lower (0.6-0.7) when ambiguous.`;

  const userPrompt = `Message: "${message}"
${conversationHistory ? `Previous messages:\n${conversationHistory}` : "First message in conversation."}
${call_scheduled ? "Call is scheduled." : ""}

Classify the state.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more deterministic output
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<ConversationStateResult>;

    // Validate state
    const validStates: ConversationState[] = [
      "NEW_INTEREST",
      "CLARIFICATION",
      "CONSIDERING",
      "SOFT_OBJECTION",
      "HARD_OBJECTION",
      "DRIFT",
      "COMMITMENT",
      "POST_BOOKING",
      "NO_SHOW",
      "COLD",
    ];

    const state = validStates.includes(parsed.state as ConversationState)
      ? (parsed.state as ConversationState)
      : "NEW_INTEREST";

    const confidence = Math.min(1, Math.max(0, parsed.confidence ?? 0.7));
    const reasoning_tags = Array.isArray(parsed.reasoning_tags) ? parsed.reasoning_tags : [];

    return {
      state,
      confidence,
      reasoning_tags,
    };
  } catch (error) {
    // LLM classification failed; rethrow
    // Safe fallback
    return {
      state: "NEW_INTEREST",
      confidence: 0.5,
      reasoning_tags: ["classification_failed"],
    };
  }
}

/**
 * Get conversation context for state resolution.
 */
export async function getConversationContext(
  leadId: string,
  conversationId: string
): Promise<ConversationContext> {
  const db = (await import("@/lib/db/queries")).getDb();
  const now = new Date();

  // Get recent messages
  const { data: messages } = await db
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(5);

  const messageList = (messages ?? []).reverse() as Array<{
    role: "user" | "assistant";
    content: string;
    created_at: string;
  }>;

  const lastUserMessage = messageList.find((m) => m.role === "user");
  const lastAssistantMessage = messageList.find((m) => m.role === "assistant");

  // Calculate conversation age
  const firstMessage = messageList[0];
  const conversationAgeHours = firstMessage
    ? (now.getTime() - new Date(firstMessage.created_at).getTime()) / (1000 * 60 * 60)
    : 0;

  // Check for scheduled call
  const { data: upcomingCall } = await db
    .from("call_sessions")
    .select("call_started_at")
    .eq("lead_id", leadId)
    .gte("call_started_at", now.toISOString())
    .order("call_started_at", { ascending: true })
    .limit(1)
    .single();

  const callScheduled = !!upcomingCall;
  const callInFutureHours = upcomingCall
    ? (new Date((upcomingCall as { call_started_at: string }).call_started_at).getTime() - now.getTime()) / (1000 * 60 * 60)
    : undefined;

  // Calculate last reply timing
  let lastReplyHoursAgo: number | undefined;
  if (lastAssistantMessage && lastUserMessage) {
    const assistantTime = new Date(lastAssistantMessage.created_at).getTime();
    const userTime = new Date(lastUserMessage.created_at).getTime();
    if (userTime > assistantTime) {
      // User replied after assistant
      lastReplyHoursAgo = (now.getTime() - userTime) / (1000 * 60 * 60);
    }
  }

  const hasPreviousEngagement = messageList.length > 1;

  return {
    message: lastUserMessage?.content ?? "",
    previous_messages: messageList,
    conversation_age_hours: conversationAgeHours,
    has_previous_engagement: hasPreviousEngagement,
    last_reply_hours_ago: lastReplyHoursAgo,
    call_scheduled: callScheduled,
    call_in_future_hours: callInFutureHours,
  };
}
