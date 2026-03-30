/**
 * Adaptive Follow-Up Intelligence
 * Context-aware dynamic follow-up paths that adapt based on lead intelligence.
 * Replaces static sequence enrollment with intelligent strategy selection.
 * Integrates with Recovery Profile for customizable persistence levels.
 */

import { getDb } from "@/lib/db/queries";
import type { LeadIntelligence } from "@/lib/intelligence/lead-brain";
import type { RecoveryProfile } from "@/lib/recovery-profile";
import { setLeadPlan } from "@/lib/plans/lead-plan";
import { enqueue } from "@/lib/queue";

export type AdaptiveStrategy =
  | "aggressive_nurture"    // Hot lead, high intent — fast cadence multi-channel
  | "gentle_nurture"        // Warm lead, moderate intent — slower cadence
  | "value_drip"            // Cold/unknown intent — value-first approach
  | "reactivation_sequence" // Gone cold — angle-based reactivation
  | "appointment_protect"   // Has booking — reminder + prep flow
  | "escalation_prep"       // Anger/risk detected — prepare for human handoff
  | "win_back"              // Lost/churned — recovery approach
  | "retention_loop"        // Won/retained — keep engaged
  | "pause";                // Opted out or do-not-contact

export interface AdaptiveStep {
  order: number;
  channel: "sms" | "email" | "call" | "voicemail_drop";
  delay_minutes: number;
  template_key: string;
  condition?: string; // e.g. "no_reply_after_step_1"
}

export interface AdaptiveFollowUpPlan {
  strategy: AdaptiveStrategy;
  steps: AdaptiveStep[];
  max_touches: number;
  cooldown_hours: number;
  exit_conditions: string[];
}

/**
 * Get delay multiplier for recovery profile.
 * Conservative: longer delays (1.5x), Standard: no change (1.0x), Assertive: shorter (0.7x)
 */
function getDelayMultiplierForProfile(recoveryProfile?: RecoveryProfile): number {
  switch (recoveryProfile) {
    case "conservative":
      return 1.5; // Stretch delays by 50% for gentle pacing
    case "assertive":
      return 0.7; // Compress delays by 30% for faster cadence
    case "standard":
    default:
      return 1.0; // No adjustment
  }
}

/**
 * Pure function: deterministic strategy selection based on lead intelligence.
 * No side effects, no DB calls, no randomness.
 * Optionally biased by recovery profile for persistence level customization.
 */
export function selectAdaptiveStrategy(
  intelligence: LeadIntelligence,
  recoveryProfile?: RecoveryProfile
): AdaptiveStrategy {
  const { risk_flags, lifecycle_phase, conversion_probability, urgency_score } = intelligence;

  // Opt-out / do-not-contact takes absolute precedence
  if (risk_flags.includes("opt_out_signal")) {
    return "pause";
  }

  // Anger / hostile detected — prepare escalation
  if (risk_flags.includes("anger")) {
    return "escalation_prep";
  }

  // Lifecycle phase rules
  if (lifecycle_phase === "WON" || lifecycle_phase === "RETAIN") {
    return "retention_loop";
  }
  if (lifecycle_phase === "LOST") {
    return "win_back";
  }
  if (lifecycle_phase === "REACTIVATE") {
    return "reactivation_sequence";
  }
  if (lifecycle_phase === "BOOKED" || lifecycle_phase === "SHOWED") {
    return "appointment_protect";
  }

  // Recovery profile biases for hot leads
  if (conversion_probability >= 0.7 && urgency_score >= 60) {
    // "assertive" or "aggressive" profiles push toward aggressive_nurture
    if (recoveryProfile === "assertive") {
      return "aggressive_nurture";
    }
    // "conservative" profile scales back to gentle even for hot leads
    if (recoveryProfile === "conservative") {
      return "gentle_nurture";
    }
    // standard/default: use normal aggressive_nurture for hot leads
    return "aggressive_nurture";
  }

  // Warm lead: moderate probability
  if (conversion_probability >= 0.4) {
    // "conservative" profile: only proceed if conversion prob is higher
    if (recoveryProfile === "conservative" && conversion_probability < 0.6) {
      return "value_drip";
    }
    return "gentle_nurture";
  }

  // "minimal" profile equivalent: only pursue if high confidence
  if (recoveryProfile === "conservative" && conversion_probability < 0.5) {
    return "value_drip";
  }

  // Default: cold/unknown intent
  return "value_drip";
}

/**
 * Build a multi-step follow-up plan based on strategy.
 * Each strategy has predefined channel mix and timing.
 * Recovery profile optionally adjusts delays: conservative = longer, assertive = shorter.
 */
export function buildAdaptiveFollowUpPlan(
  strategy: AdaptiveStrategy,
  intelligence: LeadIntelligence,
  recoveryProfile?: RecoveryProfile
): AdaptiveFollowUpPlan {
  // Calculate delay multiplier based on recovery profile
  const delayMultiplier = getDelayMultiplierForProfile(recoveryProfile);
  switch (strategy) {
    case "aggressive_nurture":
      return {
        strategy,
        steps: [
          { order: 1, channel: "sms", delay_minutes: 0, template_key: "aggressive_open" },
          { order: 2, channel: "email", delay_minutes: Math.round(60 * delayMultiplier), template_key: "aggressive_follow" },
          { order: 3, channel: "call", delay_minutes: Math.round(240 * delayMultiplier), template_key: "aggressive_call" },
          { order: 4, channel: "sms", delay_minutes: Math.round(1440 * delayMultiplier), template_key: "aggressive_reminder" },
          { order: 5, channel: "email", delay_minutes: Math.round(2880 * delayMultiplier), template_key: "aggressive_close" },
        ],
        max_touches: 5,
        cooldown_hours: Math.round(24 * delayMultiplier),
        exit_conditions: ["reply_received", "opted_out", "scheduled_appointment"],
      };

    case "gentle_nurture":
      return {
        strategy,
        steps: [
          { order: 1, channel: "sms", delay_minutes: 0, template_key: "gentle_open" },
          { order: 2, channel: "email", delay_minutes: Math.round(1440 * delayMultiplier), template_key: "gentle_value" },
          { order: 3, channel: "sms", delay_minutes: Math.round(4320 * delayMultiplier), template_key: "gentle_close" },
        ],
        max_touches: 3,
        cooldown_hours: Math.round(48 * delayMultiplier),
        exit_conditions: ["reply_received", "opted_out", "no_reply_after_72h"],
      };

    case "value_drip":
      return {
        strategy,
        steps: [
          { order: 1, channel: "email", delay_minutes: 0, template_key: "value_1_intro" },
          { order: 2, channel: "email", delay_minutes: Math.round(4320 * delayMultiplier), template_key: "value_2_social_proof" },
          { order: 3, channel: "sms", delay_minutes: Math.round(10080 * delayMultiplier), template_key: "value_3_cta" },
        ],
        max_touches: 3,
        cooldown_hours: Math.round(72 * delayMultiplier),
        exit_conditions: ["reply_received", "opted_out"],
      };

    case "reactivation_sequence":
      return {
        strategy,
        steps: [
          { order: 1, channel: "sms", delay_minutes: 0, template_key: "reactivate_value_angle" },
          { order: 2, channel: "email", delay_minutes: Math.round(2880 * delayMultiplier), template_key: "reactivate_proof_angle" },
          { order: 3, channel: "sms", delay_minutes: Math.round(7200 * delayMultiplier), template_key: "reactivate_urgency_angle" },
        ],
        max_touches: 3,
        cooldown_hours: Math.round(48 * delayMultiplier),
        exit_conditions: ["reply_received", "opted_out", "scheduled_call"],
      };

    case "appointment_protect":
      return {
        strategy,
        steps: [
          { order: 1, channel: "sms", delay_minutes: 0, template_key: "appt_confirm" },
          { order: 2, channel: "sms", delay_minutes: Math.round(1440 * delayMultiplier), template_key: "appt_reminder_24h" },
          { order: 3, channel: "email", delay_minutes: 60, template_key: "appt_prep_info", condition: "1h_before_apt" },
        ],
        max_touches: 3,
        cooldown_hours: 1,
        exit_conditions: ["appointment_completed", "appointment_cancelled", "no_show"],
      };

    case "escalation_prep":
      return {
        strategy,
        steps: [
          { order: 1, channel: "email", delay_minutes: 0, template_key: "escalate_acknowledgment" },
        ],
        max_touches: 1,
        cooldown_hours: 0,
        exit_conditions: ["escalated_to_human"],
      };

    case "win_back":
      return {
        strategy,
        steps: [
          { order: 1, channel: "email", delay_minutes: 0, template_key: "winback_value_prop" },
          { order: 2, channel: "sms", delay_minutes: Math.round(4320 * delayMultiplier), template_key: "winback_special_offer" },
          { order: 3, channel: "call", delay_minutes: Math.round(10080 * delayMultiplier), template_key: "winback_personal_outreach" },
        ],
        max_touches: 3,
        cooldown_hours: Math.round(72 * delayMultiplier),
        exit_conditions: ["reply_received", "opted_out", "re_engaged"],
      };

    case "retention_loop":
      return {
        strategy,
        steps: [
          { order: 1, channel: "email", delay_minutes: 0, template_key: "retain_thank_you" },
          { order: 2, channel: "sms", delay_minutes: Math.round(10080 * delayMultiplier), template_key: "retain_checkin" },
          { order: 3, channel: "email", delay_minutes: Math.round(43200 * delayMultiplier), template_key: "retain_loyalty_offer" },
        ],
        max_touches: 3,
        cooldown_hours: Math.round(168 * delayMultiplier),
        exit_conditions: ["opted_out", "support_ticket"],
      };

    case "pause":
    default:
      return {
        strategy: "pause",
        steps: [],
        max_touches: 0,
        cooldown_hours: 0,
        exit_conditions: ["paused"],
      };
  }
}

/**
 * Execute one adaptive step: send SMS/email, schedule call, or enqueue voicemail.
 * Returns success/failure details. Non-blocking for external services.
 */
export async function executeAdaptiveStep(
  workspaceId: string,
  leadId: string,
  step: AdaptiveStep
): Promise<{ success: boolean; details: string }> {
  const db = getDb();

  try {
    // Fetch lead contact info
    const { data: leadRow } = await db
      .from("leads")
      .select("id, phone, email, name, status")
      .eq("id", leadId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const lead = leadRow as {
      id?: string;
      phone?: string;
      email?: string;
      name?: string;
      status?: string;
    } | null;

    if (!lead) {
      return { success: false, details: "Lead not found" };
    }

    if (lead.status === "CLOSED" || lead.status === "LOST") {
      return { success: false, details: "Lead opted out — cannot execute" };
    }

    // SMS execution
    if (step.channel === "sms") {
      if (!lead.phone) {
        return { success: false, details: "No phone number on file" };
      }
      try {
        const { data: phoneConfig } = await db
          .from("phone_configs")
          .select("proxy_number")
          .eq("workspace_id", workspaceId)
          .eq("status", "active")
          .maybeSingle();

        const fromNumber = (phoneConfig as { proxy_number?: string } | null)?.proxy_number;
        if (!fromNumber) {
          return { success: false, details: "No active phone config" };
        }

        const { getTelephonyService } = await import("@/lib/telephony");
        const svc = getTelephonyService();
        await svc.sendSms({
          from: fromNumber,
          to: lead.phone,
          text: `[${step.template_key}] Hi ${lead.name || "there"}! Placeholder SMS from adaptive sequence.`,
        });

        return { success: true, details: `SMS sent to ${lead.phone} via ${fromNumber}` };
      } catch (err) {
        return {
          success: false,
          details: `SMS error: ${err instanceof Error ? err.message : "Unknown"}`,
        };
      }
    }

    // Email execution
    if (step.channel === "email") {
      if (!lead.email) {
        return { success: false, details: "No email on file" };
      }
      try {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
          return { success: false, details: "Resend API key not configured" };
        }

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL ?? "noreply@recall-touch.com",
            to: lead.email,
            subject: `[Adaptive] ${step.template_key.replace(/_/g, " ")}`,
            text: `Hi ${lead.name || "there"},\n\nThis is an adaptive follow-up email (${step.template_key}).\n\nBest regards`,
          }),
        });

        if (res.ok) {
          return { success: true, details: `Email sent to ${lead.email}` };
        }
        return { success: false, details: `Email API error: ${res.status}` };
      } catch (err) {
        return {
          success: false,
          details: `Email error: ${err instanceof Error ? err.message : "Unknown"}`,
        };
      }
    }

    // Call execution: schedule via lead plan
    if (step.channel === "call") {
      try {
        const callAt = new Date(Date.now() + step.delay_minutes * 60 * 1000);
        await setLeadPlan(workspaceId, leadId, {
          next_action_type: "adaptive_call",
          next_action_at: callAt.toISOString(),
        });
        return {
          success: true,
          details: `Call scheduled for ${callAt.toISOString()}`,
        };
      } catch (err) {
        return {
          success: false,
          details: `Call scheduling error: ${err instanceof Error ? err.message : "Unknown"}`,
        };
      }
    }

    // Voicemail drop: enqueue as a reactivation job (closest match in queue types)
    if (step.channel === "voicemail_drop") {
      try {
        await enqueue({
          type: "reactivation",
          leadId,
        });
        return { success: true, details: "Voicemail job enqueued via reactivation" };
      } catch (err) {
        return {
          success: false,
          details: `Voicemail queue error: ${err instanceof Error ? err.message : "Unknown"}`,
        };
      }
    }

    return { success: false, details: `Unknown channel: ${step.channel}` };
  } catch (err) {
    console.error(
      "[adaptive-followup] executeAdaptiveStep error:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      success: false,
      details: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
