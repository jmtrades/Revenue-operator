/**
 * Conversation Momentum — pace based on engagement.
 * High engagement → faster replies, push booking. Low → slower, lighter.
 */

import { getDb } from "@/lib/db/queries";

export type MomentumLevel = "high" | "medium" | "low";

export interface MomentumInput {
  leadId: string;
  conversationId: string;
  lastUserMessageLength?: number;
  replySpeedHours?: number[];
  questionCountLastTurn?: number;
  bookingIntentSignals?: boolean;
}

/**
 * Compute momentum from recent behaviour. Returns multiplier for delay ( < 1 = faster ).
 */
export async function computeMomentum(input: MomentumInput): Promise<{
  level: MomentumLevel;
  delayMultiplier: number;
  directness: "push" | "normal" | "light";
}> {
  const db = getDb();
  const { leadId, conversationId, lastUserMessageLength = 0, bookingIntentSignals = false } = input;

  // Recent outbound count and last few messages
  const { data: _recent } = await db
    .from("outbound_messages")
    .select("created_at")
    .eq("lead_id", leadId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: inbound } = await db
    .from("messages")
    .select("content, created_at")
    .eq("conversation_id", conversationId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(5);

  const replySpeeds = (input.replySpeedHours ?? []);
  const avgReplyHours = replySpeeds.length > 0
    ? replySpeeds.reduce((a, b) => a + b, 0) / replySpeeds.length
    : 24;
  const longMessages = (inbound ?? []).filter((m: { content?: string }) => (m.content?.length ?? 0) > 80).length;
  const hasBookingIntent = bookingIntentSignals || (inbound ?? []).some(
    (m: { content?: string }) => /book|schedule|when can we|call (me|us)|available/i.test(m.content ?? "")
  );

  let level: MomentumLevel = "medium";
  let delayMultiplier = 1;
  let directness: "push" | "normal" | "light" = "normal";

  if (hasBookingIntent && lastUserMessageLength > 20) {
    level = "high";
    delayMultiplier = 0.6;
    directness = "push";
  } else if (avgReplyHours < 2 && longMessages >= 2) {
    level = "high";
    delayMultiplier = 0.75;
    directness = "push";
  } else if (avgReplyHours > 48 || (inbound ?? []).length <= 1) {
    level = "low";
    delayMultiplier = 1.25;
    directness = "light";
  }

  return { level, delayMultiplier, directness };
}
