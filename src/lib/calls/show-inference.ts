/**
 * Show / No-show inference: set call_sessions.show_status, show_confidence, show_reason.
 * Signals: calendar cancelled, duration, inbound messages, wrap-up override.
 */

export type ShowStatus = "showed" | "no_show" | "unknown";

export interface InferShowInput {
  callSession: {
    call_started_at?: string | null;
    call_ended_at?: string | null;
    metadata?: { status?: string; duration_minutes?: number } | null;
    show_status?: string | null;
  };
  recentMessages?: Array<{ content: string; role?: string }>;
  wrapUp?: { outcome: string } | null;
}

export interface InferShowResult {
  status: ShowStatus;
  confidence: number;
  reason: string;
}

const NO_SHOW_PHRASES = [
  "missed it",
  "missed the call",
  "couldn't make it",
  "couldn't join",
  "sorry i missed",
  "we didn't connect",
  "can we reschedule",
  "reschedule",
  "something came up",
  "had to run",
  "didn't get to connect",
];

function messageSuggestsNoShow(messages: Array<{ content: string }>): boolean {
  const combined = messages.map((m) => m.content?.toLowerCase() ?? "").join(" ");
  return NO_SHOW_PHRASES.some((p) => combined.includes(p));
}

function durationMinutes(start: string | undefined | null, end: string | undefined | null): number | null {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  return Math.round((b - a) / 60000);
}

/** Infer show status from call session, recent messages, and optional wrap-up. */
export function inferShowStatus(input: InferShowInput): InferShowResult {
  if (input.wrapUp?.outcome) {
    if (input.wrapUp.outcome === "not_fit") {
      return { status: "showed", confidence: 1, reason: "Closer wrap-up: not a fit (call happened)." };
    }
    return { status: "showed", confidence: 1, reason: "Closer wrap-up: " + input.wrapUp.outcome + "." };
  }

  const meta = input.callSession.metadata ?? {};
  if (meta.status === "cancelled") {
    return { status: "no_show", confidence: 0.9, reason: "Calendar event cancelled." };
  }

  const mins = input.callSession.metadata?.duration_minutes ?? durationMinutes(input.callSession.call_started_at ?? undefined, input.callSession.call_ended_at ?? undefined);
  if (mins !== null && mins < 2) {
    return { status: "no_show", confidence: 0.7, reason: "Call duration under 2 minutes (likely no-show)." };
  }

  const messages = input.recentMessages ?? [];
  if (messageSuggestsNoShow(messages)) {
    return { status: "no_show", confidence: 0.85, reason: "Inbound message suggests missed call / reschedule." };
  }

  if (mins !== null && mins >= 5) {
    return { status: "showed", confidence: 0.75, reason: "Call duration " + mins + " min suggests show." };
  }

  return {
    status: "unknown",
    confidence: 0.3,
    reason: "Insufficient signals (no wrap-up, no strong message or duration signal).",
  };
}
