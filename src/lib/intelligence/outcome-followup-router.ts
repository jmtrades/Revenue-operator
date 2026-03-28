/**
 * Outcome → Follow-up Router
 * Automatically determines the right follow-up action based on call outcome.
 * Zero manual intervention: every call outcome triggers an intelligent response.
 */

import type { OutcomeType } from "@/lib/intelligence/outcome-taxonomy";

export type FollowUpAction =
  | "enroll_nurture_sequence"     // Multi-touch nurture (SMS → email → call)
  | "enroll_hot_lead_sequence"    // Aggressive follow-up (call back within hours)
  | "enroll_revival_sequence"     // Re-engagement after cold period
  | "enroll_appointment_reminder" // Appointment confirmation + reminders
  | "send_immediate_sms"         // Quick text (confirmation, info, thanks)
  | "send_follow_up_email"       // Follow-up email with details
  | "schedule_callback"          // Schedule a callback at specific time
  | "escalate_to_human"          // Alert human team member immediately
  | "do_not_contact"             // Opt-out: remove from all sequences
  | "retry_call"                 // Call failed: retry later
  | "none";                      // No follow-up needed

export interface FollowUpRouting {
  action: FollowUpAction;
  delay_minutes: number;
  channel: "sms" | "email" | "call" | "multi";
  message_tone: "warm" | "professional" | "urgent" | "light" | "apologetic";
  message_template_key: string;
  priority: "low" | "medium" | "high" | "critical";
  max_attempts: number;
  notes: string;
}

/**
 * Given a call outcome, return the optimal follow-up routing.
 * Deterministic — no AI inference, pure business logic.
 */
export function routeOutcomeToFollowUp(
  outcome: OutcomeType,
  context?: {
    duration_seconds?: number;
    sentiment?: "positive" | "neutral" | "negative";
    appointment_time?: string;
    callback_requested_time?: string;
    is_existing_customer?: boolean;
    attempt_count?: number;
  }
): FollowUpRouting {
  const ctx = context ?? {};
  const isWarm = ctx.sentiment === "positive";
  const isExisting = ctx.is_existing_customer === true;
  const attempts = ctx.attempt_count ?? 0;

  switch (outcome) {
    case "appointment_confirmed":
      return {
        action: "enroll_appointment_reminder",
        delay_minutes: 5,
        channel: "multi",
        message_tone: "warm",
        message_template_key: "appointment_confirmed",
        priority: "high",
        max_attempts: 1,
        notes: "Send confirmation SMS immediately, then reminder 24h before and 1h before appointment",
      };

    case "appointment_cancelled":
      return {
        action: "enroll_nurture_sequence",
        delay_minutes: 60,
        channel: "multi",
        message_tone: "warm",
        message_template_key: "appointment_cancelled_rebook",
        priority: "high",
        max_attempts: 3,
        notes: "Offer to rebook. Gentle nudge, not pushy. They cancelled for a reason.",
      };

    case "connected":
      // Call connected but no specific outcome — they were interested enough to talk
      if (isWarm) {
        return {
          action: "enroll_hot_lead_sequence",
          delay_minutes: 30,
          channel: "multi",
          message_tone: "warm",
          message_template_key: "post_call_warm_followup",
          priority: "high",
          max_attempts: 3,
          notes: "Positive call — strike while iron is hot. Send thanks + recap within 30 min.",
        };
      }
      return {
        action: "enroll_nurture_sequence",
        delay_minutes: 120,
        channel: "multi",
        message_tone: "professional",
        message_template_key: "post_call_standard_followup",
        priority: "medium",
        max_attempts: 3,
        notes: "Connected but didn't convert yet. Nurture with value-add content.",
      };

    case "no_answer":
      if (attempts >= 3) {
        return {
          action: "send_follow_up_email",
          delay_minutes: 60,
          channel: "email",
          message_tone: "light",
          message_template_key: "missed_call_email",
          priority: "low",
          max_attempts: 1,
          notes: "Multiple no-answers. Switch to email channel — phone may not be their preference.",
        };
      }
      return {
        action: "retry_call",
        delay_minutes: attempts === 0 ? 120 : attempts === 1 ? 360 : 1440,
        channel: "call",
        message_tone: "professional",
        message_template_key: "retry_call",
        priority: "medium",
        max_attempts: 3,
        notes: "Exponential backoff: 2h → 6h → 24h between retries.",
      };

    case "call_back_requested":
      return {
        action: "schedule_callback",
        delay_minutes: ctx.callback_requested_time ? 0 : 240,
        channel: "call",
        message_tone: "professional",
        message_template_key: "callback_scheduled",
        priority: "high",
        max_attempts: 2,
        notes: "They ASKED us to call back. Honor their request at the time they specified.",
      };

    case "information_provided":
      return {
        action: "send_follow_up_email",
        delay_minutes: 30,
        channel: "email",
        message_tone: "professional",
        message_template_key: "info_followup_email",
        priority: "medium",
        max_attempts: 1,
        notes: "They got info. Send recap email with links/details so they can reference it.",
      };

    case "information_missing":
      return {
        action: "send_follow_up_email",
        delay_minutes: 15,
        channel: "email",
        message_tone: "professional",
        message_template_key: "missing_info_request",
        priority: "high",
        max_attempts: 2,
        notes: "We couldn't answer their question. Get back to them FAST with the answer.",
      };

    case "payment_promised":
      return {
        action: "send_immediate_sms",
        delay_minutes: 5,
        channel: "sms",
        message_tone: "professional",
        message_template_key: "payment_link_sms",
        priority: "critical",
        max_attempts: 1,
        notes: "They committed to pay. Send payment link IMMEDIATELY before momentum fades.",
      };

    case "payment_made":
      return {
        action: "send_immediate_sms",
        delay_minutes: 1,
        channel: "multi",
        message_tone: "warm",
        message_template_key: "payment_confirmation",
        priority: "high",
        max_attempts: 1,
        notes: "Payment received! Confirm and thank them. Great customer experience moment.",
      };

    case "payment_failed":
      return {
        action: "send_immediate_sms",
        delay_minutes: 10,
        channel: "multi",
        message_tone: "professional",
        message_template_key: "payment_retry",
        priority: "critical",
        max_attempts: 2,
        notes: "Payment failed. Send alternative payment link. Follow up with call if still failing.",
      };

    case "opted_out":
      return {
        action: "do_not_contact",
        delay_minutes: 0,
        channel: "sms",
        message_tone: "professional",
        message_template_key: "opt_out_confirmation",
        priority: "critical",
        max_attempts: 1,
        notes: "COMPLIANCE: Remove from ALL sequences immediately. Send opt-out confirmation.",
      };

    case "complaint":
      return {
        action: "escalate_to_human",
        delay_minutes: 0,
        channel: "multi",
        message_tone: "apologetic",
        message_template_key: "complaint_escalation",
        priority: "critical",
        max_attempts: 1,
        notes: "Complaint filed. Escalate to human IMMEDIATELY. Send apologetic acknowledgment.",
      };

    case "hostile":
      return {
        action: "escalate_to_human",
        delay_minutes: 0,
        channel: "email",
        message_tone: "apologetic",
        message_template_key: "hostile_followup",
        priority: "critical",
        max_attempts: 1,
        notes: "Hostile caller. Escalate to human. Do NOT call them back automatically.",
      };

    case "refund_request":
      return {
        action: "escalate_to_human",
        delay_minutes: 0,
        channel: "email",
        message_tone: "professional",
        message_template_key: "refund_acknowledgment",
        priority: "critical",
        max_attempts: 1,
        notes: "Refund request. Acknowledge receipt, escalate to billing team.",
      };

    case "dispute":
      return {
        action: "escalate_to_human",
        delay_minutes: 0,
        channel: "email",
        message_tone: "professional",
        message_template_key: "dispute_acknowledgment",
        priority: "critical",
        max_attempts: 1,
        notes: "Dispute filed. Requires human review. No automated resolution.",
      };

    case "legal_risk":
      return {
        action: "escalate_to_human",
        delay_minutes: 0,
        channel: "email",
        message_tone: "professional",
        message_template_key: "legal_review_required",
        priority: "critical",
        max_attempts: 1,
        notes: "Legal risk detected. STOP all automation. Human review required.",
      };

    case "wrong_number":
      return {
        action: "do_not_contact",
        delay_minutes: 0,
        channel: "sms",
        message_tone: "light",
        message_template_key: "wrong_number_apology",
        priority: "low",
        max_attempts: 1,
        notes: "Wrong number. Remove from contact list. Send brief apology text.",
      };

    case "followup_scheduled":
      return {
        action: "send_immediate_sms",
        delay_minutes: 5,
        channel: "sms",
        message_tone: "professional",
        message_template_key: "followup_scheduled_confirmation",
        priority: "medium",
        max_attempts: 1,
        notes: "Follow-up already scheduled. Confirm via text.",
      };

    case "no_show":
      return {
        action: "enroll_nurture_sequence",
        delay_minutes: 60,
        channel: "multi",
        message_tone: "warm",
        message_template_key: "no_show_rebook",
        priority: "high",
        max_attempts: 3,
        notes: "They missed their appointment. Reach out warmly to rebook. Don't guilt-trip.",
      };

    case "escalation_required":
      return {
        action: "escalate_to_human",
        delay_minutes: 0,
        channel: "multi",
        message_tone: "professional",
        message_template_key: "escalation_notification",
        priority: "critical",
        max_attempts: 1,
        notes: "Requires human escalation. Alert team immediately.",
      };

    case "routed":
      return {
        action: "none",
        delay_minutes: 0,
        channel: "sms",
        message_tone: "professional",
        message_template_key: "none",
        priority: "low",
        max_attempts: 0,
        notes: "Call was routed to correct department. No automated follow-up needed.",
      };

    case "technical_issue":
      return {
        action: "retry_call",
        delay_minutes: 30,
        channel: "call",
        message_tone: "professional",
        message_template_key: "technical_retry",
        priority: "high",
        max_attempts: 2,
        notes: "Technical issue during call. Retry soon — caller may think we hung up.",
      };

    case "unknown":
    default:
      if (isExisting) {
        return {
          action: "send_follow_up_email",
          delay_minutes: 120,
          channel: "email",
          message_tone: "warm",
          message_template_key: "generic_followup_existing",
          priority: "medium",
          max_attempts: 1,
          notes: "Unknown outcome for existing customer. Send warm check-in email.",
        };
      }
      return {
        action: "enroll_nurture_sequence",
        delay_minutes: 240,
        channel: "multi",
        message_tone: "professional",
        message_template_key: "generic_followup_new",
        priority: "low",
        max_attempts: 2,
        notes: "Unknown outcome. Default to nurture sequence with longer delay.",
      };
  }
}

/**
 * Get the SMS template text for a given template key.
 * These are default templates — workspaces can override with custom templates.
 */
export function getDefaultFollowUpTemplate(
  templateKey: string,
  variables: {
    business_name?: string;
    contact_name?: string;
    appointment_time?: string;
    service?: string;
    callback_time?: string;
  } = {}
): { sms?: string; email_subject?: string; email_body?: string } {
  const name = variables.contact_name || "there";
  const biz = variables.business_name || "our team";
  const svc = variables.service || "your inquiry";

  const templates: Record<string, { sms?: string; email_subject?: string; email_body?: string }> = {
    appointment_confirmed: {
      sms: `Hi ${name}! Your appointment with ${biz} is confirmed for ${variables.appointment_time || "the scheduled time"}. We look forward to seeing you! Reply STOP to opt out.`,
      email_subject: `Your appointment with ${biz} is confirmed`,
      email_body: `Hi ${name},\n\nThis confirms your appointment with ${biz} for ${variables.appointment_time || "your scheduled time"}.\n\nIf you need to reschedule, just reply to this email or give us a call.\n\nLooking forward to it!\n\nBest,\n${biz}`,
    },
    appointment_cancelled_rebook: {
      sms: `Hi ${name}, we noticed your appointment was cancelled. No worries! When you're ready to reschedule, just reply to this text or give us a call. We're here when you need us.`,
      email_subject: `Let's reschedule your appointment — ${biz}`,
      email_body: `Hi ${name},\n\nWe noticed your appointment was cancelled. No pressure at all — when you're ready, we'd love to get you rebooked.\n\nJust reply to this email or call us to pick a new time.\n\nBest,\n${biz}`,
    },
    post_call_warm_followup: {
      sms: `Great chatting with you, ${name}! As discussed, I'll [next step]. Feel free to text me here if anything comes up. — ${biz}`,
      email_subject: `Great speaking with you — ${biz}`,
      email_body: `Hi ${name},\n\nThanks for taking the time to chat today! I really enjoyed our conversation.\n\nAs we discussed, here's what happens next:\n- [Next step summary]\n\nIf you have any questions in the meantime, don't hesitate to reach out.\n\nBest,\n${biz}`,
    },
    post_call_standard_followup: {
      sms: `Hi ${name}, thanks for speaking with us at ${biz}. We'd love to help with ${svc}. Any questions? Just text back!`,
      email_subject: `Following up — ${biz}`,
      email_body: `Hi ${name},\n\nThank you for taking our call today. We appreciate your time.\n\nIf you'd like to move forward or have any questions about ${svc}, we're here to help.\n\nBest,\n${biz}`,
    },
    missed_call_email: {
      email_subject: `We tried to reach you — ${biz}`,
      email_body: `Hi ${name},\n\nWe've tried to reach you by phone a few times but haven't been able to connect. No worries!\n\nIf you'd prefer to communicate by email, just reply here. Or if you'd like to schedule a call at a convenient time, let us know.\n\nBest,\n${biz}`,
    },
    retry_call: {
      sms: `Hi ${name}, we tried calling but couldn't reach you. We'll try again soon, or feel free to call us back at your convenience! — ${biz}`,
    },
    callback_scheduled: {
      sms: `Hi ${name}! Just confirming we'll call you back ${variables.callback_time ? `at ${variables.callback_time}` : "soon"}. Talk then! — ${biz}`,
    },
    info_followup_email: {
      email_subject: `Here's the info you requested — ${biz}`,
      email_body: `Hi ${name},\n\nThanks for your call! Here's a summary of what we discussed:\n\n[Call summary]\n\nIf you have any other questions, we're always happy to help.\n\nBest,\n${biz}`,
    },
    missing_info_request: {
      email_subject: `We have an answer for you — ${biz}`,
      email_body: `Hi ${name},\n\nYou asked us a question during our call that we wanted to make sure we got right. Here's what we found out:\n\n[Answer]\n\nHope that helps! Let us know if you need anything else.\n\nBest,\n${biz}`,
    },
    payment_link_sms: {
      sms: `Hi ${name}, here's your secure payment link as discussed: [payment_link]. If you have questions, just reply here! — ${biz}`,
    },
    payment_confirmation: {
      sms: `Thank you, ${name}! Your payment has been received. We appreciate your business! — ${biz}`,
      email_subject: `Payment confirmation — ${biz}`,
      email_body: `Hi ${name},\n\nThis confirms we've received your payment. Thank you!\n\nBest,\n${biz}`,
    },
    payment_retry: {
      sms: `Hi ${name}, it looks like there was an issue processing your payment. Here's an updated link to try again: [payment_link]. Need help? Just reply! — ${biz}`,
    },
    opt_out_confirmation: {
      sms: `You've been removed from our contact list. We're sorry for any inconvenience. — ${biz}`,
    },
    wrong_number_apology: {
      sms: `Sorry for the mix-up! We had the wrong number. You won't hear from us again. — ${biz}`,
    },
    no_show_rebook: {
      sms: `Hi ${name}, we missed you today! No worries — life happens. When you're ready to reschedule, just text back or give us a call. — ${biz}`,
      email_subject: `We missed you! Let's reschedule — ${biz}`,
      email_body: `Hi ${name},\n\nWe were looking forward to seeing you today but it looks like we missed each other.\n\nNo worries at all! When you're ready, just reply here or call us to pick a new time.\n\nBest,\n${biz}`,
    },
    followup_scheduled_confirmation: {
      sms: `Hi ${name}, just confirming our follow-up is scheduled. We'll be in touch soon! — ${biz}`,
    },
    generic_followup_existing: {
      email_subject: `Just checking in — ${biz}`,
      email_body: `Hi ${name},\n\nJust wanted to check in and see how everything's going. If there's anything we can help with, we're just a reply away.\n\nBest,\n${biz}`,
    },
    generic_followup_new: {
      sms: `Hi ${name}, thanks for connecting with ${biz}! We'd love to help you with ${svc}. Any questions? Just text back!`,
      email_subject: `Thanks for connecting — ${biz}`,
      email_body: `Hi ${name},\n\nThank you for your interest in ${biz}. We'd love to help you with ${svc}.\n\nFeel free to reply with any questions, or we'll follow up soon.\n\nBest,\n${biz}`,
    },
    complaint_escalation: {
      email_subject: `We hear you — ${biz}`,
      email_body: `Hi ${name},\n\nWe received your feedback and take it very seriously. A member of our team will be reaching out to you personally to address your concerns.\n\nWe sincerely apologize for any inconvenience.\n\nBest,\n${biz}`,
    },
    hostile_followup: {
      email_subject: `We apologize — ${biz}`,
      email_body: `Hi ${name},\n\nWe sincerely apologize for the experience you had. We want to make it right. A senior team member will be in touch shortly.\n\nBest,\n${biz}`,
    },
    refund_acknowledgment: {
      email_subject: `Your refund request — ${biz}`,
      email_body: `Hi ${name},\n\nWe've received your refund request and it's being reviewed. Someone from our billing team will follow up within 1-2 business days.\n\nBest,\n${biz}`,
    },
    dispute_acknowledgment: {
      email_subject: `Your dispute has been received — ${biz}`,
      email_body: `Hi ${name},\n\nWe've received your dispute and it's being reviewed by our team. We'll follow up with you as soon as possible.\n\nBest,\n${biz}`,
    },
    technical_retry: {
      sms: `Hi ${name}, sorry about that! We got disconnected. I'll call you back shortly. — ${biz}`,
    },
  };

  return templates[templateKey] ?? {
    sms: `Hi ${name}, thanks for connecting with ${biz}. We'll be in touch soon!`,
    email_subject: `Following up — ${biz}`,
    email_body: `Hi ${name},\n\nThank you for your time. We'll follow up soon.\n\nBest,\n${biz}`,
  };
}
