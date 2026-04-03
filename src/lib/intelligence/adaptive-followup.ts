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

/**
 * Resolve SMS/email content from template key.
 * Uses the lead's name and a professional, concise message appropriate to the
 * follow-up strategy. Templates are intentionally short for SMS and friendly
 * for email to maximize engagement.
 */
function resolveTemplate(
  templateKey: string,
  lead: { name?: string },
  channel: "sms" | "email",
): { subject?: string; body: string } {
  const name = lead.name || "there";

  const templates: Record<string, { sms: string; emailSubject: string; emailBody: string }> = {
    // Aggressive nurture
    aggressive_open: {
      sms: `Hi ${name}! Just following up on your inquiry. Would love to help you get started — is now a good time to chat?`,
      emailSubject: `Quick follow-up on your inquiry`,
      emailBody: `Hi ${name},\n\nThanks for reaching out! I wanted to follow up and see how we can help.\n\nWould you have a few minutes for a quick call this week? We'd love to learn more about what you're looking for.\n\nBest regards`,
    },
    aggressive_follow: {
      sms: `Hi ${name}, just checking in — did you have any questions about what we discussed? Happy to help anytime.`,
      emailSubject: `Still here to help, ${name}`,
      emailBody: `Hi ${name},\n\nJust wanted to check in and see if you had any questions. We're here whenever you're ready.\n\nFeel free to reply to this email or give us a call.\n\nBest regards`,
    },
    aggressive_call: {
      sms: `Hi ${name}, I'll try giving you a quick call shortly. If that doesn't work, just let me know a better time!`,
      emailSubject: `Trying to connect`,
      emailBody: `Hi ${name},\n\nI've been trying to reach you — I'd love to help answer any questions you might have.\n\nWhen's a good time for a brief chat?\n\nBest regards`,
    },
    aggressive_reminder: {
      sms: `Hi ${name}! We haven't connected yet — just wanted to make sure you didn't miss our message. Reply anytime!`,
      emailSubject: `Don't want you to miss out`,
      emailBody: `Hi ${name},\n\nJust a friendly reminder that we're here to help. If now isn't the right time, no worries at all — just let us know.\n\nBest regards`,
    },
    aggressive_close: {
      sms: `Hi ${name}, last follow-up from us! If you'd like to chat in the future, we're always here. Wishing you the best!`,
      emailSubject: `Last note from us`,
      emailBody: `Hi ${name},\n\nThis will be my last follow-up for now. If you ever want to revisit, we'll be here.\n\nWishing you all the best!\n\nBest regards`,
    },
    // Gentle nurture
    gentle_open: {
      sms: `Hi ${name}! Thanks for your interest. No rush — just wanted to introduce myself and let you know I'm here if you have questions.`,
      emailSubject: `Nice to meet you, ${name}`,
      emailBody: `Hi ${name},\n\nThanks for your interest! I wanted to reach out personally and let you know I'm here if you have any questions.\n\nNo rush at all — take your time.\n\nBest regards`,
    },
    gentle_value: {
      sms: `Hi ${name}, thought you might find this helpful — businesses like yours typically see results within the first week. Happy to share more!`,
      emailSubject: `Something that might help`,
      emailBody: `Hi ${name},\n\nI wanted to share a quick insight — businesses similar to yours often see measurable improvements within the first week.\n\nWould you like to learn how? I'm happy to walk you through it.\n\nBest regards`,
    },
    gentle_close: {
      sms: `Hi ${name}, just a final note — if you ever want to explore further, we're here. Wishing you success!`,
      emailSubject: `Wishing you success`,
      emailBody: `Hi ${name},\n\nJust wanted to say we're here whenever the timing is right. Wishing you every success!\n\nBest regards`,
    },
    // Value drip
    value_1_intro: {
      sms: `Hi ${name}! Welcome — we're excited to help you grow your business. Expect a few helpful tips from us over the coming days.`,
      emailSubject: `Welcome, ${name}!`,
      emailBody: `Hi ${name},\n\nWelcome! Over the next few days, I'll share some insights that businesses like yours have found valuable.\n\nStay tuned!\n\nBest regards`,
    },
    value_2_social_proof: {
      sms: `Hi ${name}, fun fact — our customers report recovering an average of 30% more missed calls. Want to see how?`,
      emailSubject: `How others are winning with missed call recovery`,
      emailBody: `Hi ${name},\n\nHere's something interesting — businesses using our platform recover an average of 30% more missed opportunities.\n\nWant to see how it could work for you?\n\nBest regards`,
    },
    value_3_cta: {
      sms: `Hi ${name}, ready to see it in action? We can get you set up in under 3 minutes. Reply YES to get started!`,
      emailSubject: `Ready to get started?`,
      emailBody: `Hi ${name},\n\nIf you're ready to see results, we can have you up and running in under 3 minutes.\n\nJust reply to this email and we'll take it from there.\n\nBest regards`,
    },
    // Reactivation
    reactivate_value_angle: {
      sms: `Hi ${name}! It's been a while — we've added some great new features since we last connected. Worth a quick look?`,
      emailSubject: `We've been busy — here's what's new`,
      emailBody: `Hi ${name},\n\nIt's been a while! We've made some exciting improvements and I thought of you.\n\nWould you like a quick overview of what's new?\n\nBest regards`,
    },
    reactivate_proof_angle: {
      sms: `Hi ${name}, businesses in your industry are seeing amazing results. Thought you'd want to know!`,
      emailSubject: `Your industry is seeing great results`,
      emailBody: `Hi ${name},\n\nBusinesses in your industry are achieving outstanding results with our platform. I thought you'd want to hear about it.\n\nHappy to share specifics if you're interested.\n\nBest regards`,
    },
    reactivate_urgency_angle: {
      sms: `Hi ${name}, last chance to reconnect! We'd love to help you get started. Reply if interested.`,
      emailSubject: `One more thing before we go`,
      emailBody: `Hi ${name},\n\nThis is my final reach-out for now. If you're interested in exploring what we can do for your business, I'd love to help.\n\nOtherwise, I wish you every success!\n\nBest regards`,
    },
    // Appointment protect
    appt_confirm: {
      sms: `Hi ${name}! Your appointment is confirmed. Looking forward to speaking with you!`,
      emailSubject: `Your appointment is confirmed`,
      emailBody: `Hi ${name},\n\nJust confirming your upcoming appointment. We're looking forward to it!\n\nIf you need to reschedule, just reply to this email.\n\nBest regards`,
    },
    appt_reminder_24h: {
      sms: `Hi ${name}, friendly reminder — your appointment is tomorrow! Let us know if you need to reschedule.`,
      emailSubject: `Reminder: Your appointment is tomorrow`,
      emailBody: `Hi ${name},\n\nJust a quick reminder that your appointment is tomorrow. We're excited to connect!\n\nIf you need to make any changes, just let us know.\n\nBest regards`,
    },
    appt_prep_info: {
      sms: `Hi ${name}, your appointment is coming up soon! We're ready for you.`,
      emailSubject: `Getting ready for your appointment`,
      emailBody: `Hi ${name},\n\nYour appointment is coming up shortly. Here's what to expect: we'll review your needs and show you exactly how we can help.\n\nSee you soon!\n\nBest regards`,
    },
    // Escalation
    escalate_acknowledgment: {
      sms: `Hi ${name}, we've escalated your request to our team lead. You'll hear from them shortly.`,
      emailSubject: `Your request has been escalated`,
      emailBody: `Hi ${name},\n\nWe want to make sure you get the best possible help. Your request has been escalated to a senior team member who will be reaching out shortly.\n\nBest regards`,
    },
    // Retention
    retain_thank_you: {
      sms: `Hi ${name}, thanks for being a valued customer! We truly appreciate your business.`,
      emailSubject: `Thank you, ${name}!`,
      emailBody: `Hi ${name},\n\nI just wanted to take a moment to say thank you for being a valued customer. We're so glad to have you!\n\nIf there's anything we can do to help you get even more value, don't hesitate to reach out.\n\nBest regards`,
    },
    retain_checkin: {
      sms: `Hi ${name}, checking in — how's everything going? Let us know if you need anything!`,
      emailSubject: `How's everything going?`,
      emailBody: `Hi ${name},\n\nJust checking in to see how things are going. Are you getting the most out of everything?\n\nIf you have any questions or feedback, I'd love to hear from you.\n\nBest regards`,
    },
    retain_loyalty_offer: {
      sms: `Hi ${name}, as a valued customer, we'd like to offer you something special. Reply to learn more!`,
      emailSubject: `A special offer just for you`,
      emailBody: `Hi ${name},\n\nAs one of our valued customers, we have a special offer we'd like to share with you.\n\nReply to this email and we'll send you the details.\n\nBest regards`,
    },
  };

  const tmpl = templates[templateKey];
  if (!tmpl) {
    // Fallback for unknown template keys
    if (channel === "sms") {
      return { body: `Hi ${name}, just following up — let us know if we can help with anything!` };
    }
    return {
      subject: "Following up",
      body: `Hi ${name},\n\nJust following up to see how we can help. Feel free to reach out anytime.\n\nBest regards`,
    };
  }

  if (channel === "sms") {
    return { body: tmpl.sms };
  }
  return { subject: tmpl.emailSubject, body: tmpl.emailBody };
}

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
        const { body: smsText } = resolveTemplate(step.template_key, lead, "sms");
        await svc.sendSms({
          from: fromNumber,
          to: lead.phone,
          text: smsText,
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

        const { subject, body: emailBody } = resolveTemplate(step.template_key, lead, "email");
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL ?? "noreply@recall-touch.com",
            to: lead.email,
            subject: subject ?? "Following up",
            text: emailBody,
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
  } catch (_err) {
    // Error in adaptive followup execution (error details omitted to protect PII)
    return {
      success: false,
      details: "Adaptive followup execution error",
    };
  }
}
