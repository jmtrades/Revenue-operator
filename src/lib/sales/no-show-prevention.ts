/**
 * Phase 12c.10 — No-show prevention engine.
 *
 * Research gap (Phase 12a): scheduling tools (Calendly, Chili Piper, HubSpot
 * Meetings) and sales engagement platforms send one SMS reminder an hour
 * before a meeting and call it done. No-show rates across SMB sales
 * categories run 28–40%. Top complaint: "I spent $500 on ads only to have
 * 60% of the booked demos ghost me."
 *
 * This module builds a TIERED reminder plan sized to the appointment's
 * intrinsic risk (commitment score, lead source, days out, time of day).
 * Higher risk → more touches through more channels (email → SMS → AI call
 * → human).
 *
 * Pure function. Produces a PreventionPlan with scheduled tasks the caller
 * enqueues into the messaging/voice infrastructure.
 */

export type Channel = "email" | "sms" | "ai_call" | "human_call" | "push" | "whatsapp";

export interface Appointment {
  id: string;
  leadId: string;
  workspaceId: string;
  /** ISO of the scheduled appointment. */
  scheduledAt: string;
  /** Duration in minutes. */
  durationMinutes: number;
  /** e.g. "demo" | "consult" | "walkthrough" | "in-person". */
  type: string;
  /** Source of the booking: paid_ad, organic_form, referral, inbound_call, outbound_call. */
  source: string;
  leadTimezone?: string | null;
}

export interface AppointmentRiskInputs {
  /** 0..1 commitment score (from commitment/index.ts). */
  commitmentScore: number;
  /** Prior no-show count for this lead. */
  priorNoShows: number;
  /** Prior reschedules count for this lead. */
  priorReschedules: number;
  /** Is this lead new (first interaction)? */
  isNew: boolean;
  /** Does the channel used to book usually correlate with lower intent?
   *  (e.g. paid ads often → higher no-show than referrals). */
  highRiskSource?: boolean;
}

export interface ScheduledReminder {
  /** ISO of when to send. */
  at: string;
  channel: Channel;
  /** The template id to use for the given channel. */
  templateId: string;
  /** Human-readable note for ops. */
  note: string;
  /** Priority: higher = more important; used when scheduler has budget limits. */
  priority: number;
  /** If this reminder fails to elicit a response/confirmation, escalate to this channel. */
  escalateTo?: Channel | null;
}

export interface PreventionPlan {
  appointmentId: string;
  /** Overall risk score 0..1. */
  riskScore: number;
  riskTier: "low" | "medium" | "high" | "severe";
  reminders: ScheduledReminder[];
  notes: string[];
}

// ---------------------------------------------------------------------------
// Risk scoring
// ---------------------------------------------------------------------------

export function scoreAppointmentRisk(inputs: AppointmentRiskInputs): { score: number; tier: PreventionPlan["riskTier"] } {
  // Start from (1 - commitmentScore) so low commitment → high risk.
  let risk = Math.max(0, Math.min(1, 1 - inputs.commitmentScore));

  risk += Math.min(0.4, inputs.priorNoShows * 0.2);
  risk += Math.min(0.2, inputs.priorReschedules * 0.07);
  if (inputs.isNew) risk += 0.1;
  if (inputs.highRiskSource) risk += 0.1;
  risk = Math.max(0, Math.min(1, risk));

  let tier: PreventionPlan["riskTier"] = "low";
  if (risk >= 0.75) tier = "severe";
  else if (risk >= 0.5) tier = "high";
  else if (risk >= 0.3) tier = "medium";

  return { score: Number(risk.toFixed(2)), tier };
}

// ---------------------------------------------------------------------------
// Reminder cadence design
//
// Think in units of hours before the appointment:
//   H-72   confirmation email (all tiers)
//   H-48   SMS nudge          (medium+)
//   H-24   SMS reminder       (all tiers)
//   H-4    SMS final          (high+)
//   H-1    AI confirm call    (high+)
//   H-0.5  human intervention (severe)
//   H+10m  no-show recovery   (on detection of miss)
// ---------------------------------------------------------------------------

function iso(offsetMs: number, base: number): string {
  return new Date(base + offsetMs).toISOString();
}

export function buildPreventionPlan(
  appt: Appointment,
  risk: AppointmentRiskInputs,
): PreventionPlan {
  const { score: riskScore, tier } = scoreAppointmentRisk(risk);
  const base = new Date(appt.scheduledAt).getTime();
  const reminders: ScheduledReminder[] = [];
  const notes: string[] = [];

  const now = Date.now();
  const msUntil = base - now;

  // Helper to only add reminders that are in the future
  const push = (r: ScheduledReminder) => {
    if (new Date(r.at).getTime() > now + 60_000) reminders.push(r);
  };

  // Confirmation email ~72h out
  push({
    at: iso(-72 * 3600 * 1000, base),
    channel: "email",
    templateId: "confirmation_email",
    note: "Initial confirmation — include calendar invite, value reminder, and prep checklist.",
    priority: 1,
  });

  // SMS nudge 48h (medium+)
  if (tier !== "low") {
    push({
      at: iso(-48 * 3600 * 1000, base),
      channel: "sms",
      templateId: "friendly_nudge_sms",
      note: "Looking-forward SMS; ask one warm-up question.",
      priority: 2,
      escalateTo: "email",
    });
  }

  // SMS reminder 24h (all tiers)
  push({
    at: iso(-24 * 3600 * 1000, base),
    channel: "sms",
    templateId: "24h_reminder_sms",
    note: "24h reminder with confirm link + reply-YES.",
    priority: 3,
    escalateTo: tier === "low" ? "email" : "ai_call",
  });

  // SMS final 4h (high+)
  if (tier === "high" || tier === "severe") {
    push({
      at: iso(-4 * 3600 * 1000, base),
      channel: "sms",
      templateId: "final_sms",
      note: "Short final check-in — reply YES to confirm.",
      priority: 4,
      escalateTo: "ai_call",
    });
  }

  // AI confirm call 1h (high+)
  if (tier === "high" || tier === "severe") {
    push({
      at: iso(-60 * 60 * 1000, base),
      channel: "ai_call",
      templateId: "ai_confirmation_call",
      note: "30-second AI call: confirm attendance, offer reschedule before no-show.",
      priority: 5,
      escalateTo: tier === "severe" ? "human_call" : null,
    });
  }

  // Human intervention 30m (severe only)
  if (tier === "severe") {
    push({
      at: iso(-30 * 60 * 1000, base),
      channel: "human_call",
      templateId: "human_escalation",
      note: "Human ring-through. Priority: retain the appointment or convert to immediate chat.",
      priority: 6,
    });
  }

  // Post-miss recovery (always — evaluated if they don't show)
  push({
    at: iso(+10 * 60 * 1000, base),
    channel: "sms",
    templateId: "no_show_recovery_sms",
    note: "Only send if AI/human detects no-show. Warm, non-judgy, one-tap reschedule.",
    priority: 7,
  });

  // Commentary
  if (msUntil < 4 * 3600 * 1000 && msUntil > 0) {
    notes.push(`Appointment is in <4h — some reminders skipped as past.`);
  }
  if (risk.priorNoShows >= 2) {
    notes.push(`Lead has ${risk.priorNoShows} prior no-shows — consider pre-payment/deposit.`);
  }
  if (risk.isNew && risk.highRiskSource) {
    notes.push("New lead from high-risk source — budget weight on AI confirm call pays off here.");
  }

  return {
    appointmentId: appt.id,
    riskScore,
    riskTier: tier,
    reminders,
    notes,
  };
}

/**
 * Lightweight: given an existing plan and a fresh signal (reply, confirmation),
 * prune future reminders we no longer need to send.
 */
export function pruneRemindersOnConfirm(plan: PreventionPlan): PreventionPlan {
  const kept: ScheduledReminder[] = [];
  for (const r of plan.reminders) {
    // Keep post-miss recovery (still useful); drop pre-appointment nags.
    if (r.templateId === "no_show_recovery_sms") {
      kept.push(r);
      continue;
    }
    // Drop reminders within the "reduce nagging on confirmed" band
    if (r.priority >= 3) continue;
    kept.push(r);
  }
  return { ...plan, reminders: kept };
}
