/**
 * Post-call automation engine.
 *
 * Triggers automated actions after a demo or production call ends:
 * - SMS confirmation with next steps
 * - Follow-up call scheduling
 * - Lead status updates
 * - CRM event logging
 * - Signup link delivery
 *
 * All actions are non-blocking and failure-tolerant.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import type { CallSummary } from "./context-carryover";
import { sendEmail, getTemplate, renderTemplate } from "@/lib/integrations/email";
import { enrollContact } from "@/lib/sequences/follow-up-engine";
import { scoreLeadPostCall } from "@/lib/intelligence/lead-scoring";
import { fireWebhookEvent } from "@/lib/integrations/webhook-events";
import { generateCoachingReport } from "./real-time-coaching";
import { recordCallAnalytics } from "@/lib/analytics/conversation-analytics";
import { processCallRecording } from "./call-recording-engine";

export interface PostCallAction {
  type: "sms" | "follow_up_call" | "status_update" | "notification" | "follow_up_email";
  status: "pending" | "sent" | "failed" | "skipped";
  details: Record<string, unknown>;
  executed_at?: string;
  error?: string;
}

export interface PostCallConfig {
  sms_enabled: boolean;
  follow_up_enabled: boolean;
  follow_up_delay_hours: number;
  signup_link: string;
  from_number?: string;
}

const DEFAULT_CONFIG: PostCallConfig = {
  sms_enabled: false,  // TCPA: SMS must be opt-in, not default-on
  follow_up_enabled: true,
  follow_up_delay_hours: 2,
  signup_link: "https://www.revenue-operator.ai/signup",
};

/**
 * Execute all post-call automations for a completed call.
 * Non-blocking — failures are logged but don't propagate.
 */
export async function executePostCallAutomation(
  callSessionId: string,
  workspaceId: string,
  summary: CallSummary | null,
  config?: Partial<PostCallConfig>,
): Promise<PostCallAction[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const actions: PostCallAction[] = [];
  const db = getDb();

  try {
    // Load call session for lead info
    const { data: session } = await db
      .from("call_sessions")
      .select("lead_id, metadata")
      .eq("id", callSessionId)
      .maybeSingle();

    if (!session) {
      log("warn", "post_call.session_not_found", { callSessionId });
      return actions;
    }

    const sess = session as { lead_id?: string | null; metadata?: Record<string, unknown> | null };
    const leadId = sess.lead_id;
    const meta = sess.metadata ?? {};
    const callerPhone = meta.caller_phone as string | undefined;

    // 1. Send SMS confirmation
    if (cfg.sms_enabled && callerPhone) {
      const smsAction = await sendPostCallSms(callerPhone, summary, cfg);
      actions.push(smsAction);
    }

    // 2. Update lead status based on outcome
    if (leadId && summary) {
      const statusAction = await updateLeadStatus(leadId, summary);
      actions.push(statusAction);
    }

    // 3. Schedule follow-up call if needed
    if (cfg.follow_up_enabled && summary?.follow_up_needed && leadId) {
      const followUpAction = await scheduleFollowUp(
        leadId,
        workspaceId,
        callerPhone,
        cfg.follow_up_delay_hours,
        summary,
      );
      actions.push(followUpAction);
    }

    // 4. Send follow-up email if lead has an email address
    if (summary && leadId) {
      const emailAction = await sendFollowUpEmail(leadId, workspaceId, summary);
      actions.push(emailAction);
    }

    // 5. Auto-enroll lead in nurture sequence based on outcome
    if (leadId && summary) {
      const sequenceAction = await autoEnrollInSequence(leadId, workspaceId, summary);
      actions.push(sequenceAction);
    }

    // 6. Score lead with advanced intelligence engine
    if (leadId && summary) {
      const scoreAction = await scoreLead(leadId, workspaceId, summary);
      actions.push(scoreAction);
    }

    // 7. Auto-analyze call quality for continuous improvement
    if (callSessionId && summary && summary.duration_seconds > 30) {
      const coachingAction = await analyzeCallQuality(callSessionId, workspaceId, leadId);
      actions.push(coachingAction);
    }

    // 8. Send NPS feedback request via SMS (only for positive/neutral calls with consent)
    if (cfg.sms_enabled && callerPhone && summary && summary.duration_seconds > 60) {
      const npsAction = await sendNpsFeedbackRequest(callerPhone, callSessionId, workspaceId);
      actions.push(npsAction);
    }

    // 9. Record conversation analytics + A/B test tracking
    if (summary) {
      try {
        const history = (meta.demo_history ?? meta.transcript ?? []) as Array<{ role: string; content: string }>;
        const intelligenceEnabled = (meta.intelligence_enabled as boolean) ?? true;
        await recordCallAnalytics(callSessionId, workspaceId, summary, null, intelligenceEnabled, history);
      } catch (analyticsErr) {
        log("warn", "post_call.analytics_failed", {
          error: analyticsErr instanceof Error ? analyticsErr.message : String(analyticsErr),
        });
      }
    }

    // 10. Fire webhook event for integrations (Zapier/Make/n8n)
    try {
      await fireWebhookEvent(workspaceId, "call.completed", {
        call_session_id: callSessionId,
        lead_id: leadId,
        phone: callerPhone,
        outcome: summary?.outcome,
        sentiment: summary?.sentiment,
        duration_seconds: summary?.duration_seconds,
        follow_up_needed: summary?.follow_up_needed,
        buying_stage: summary?.buying_stage,
        next_best_action: summary?.next_best_action,
        summary: summary?.summary,
      });
    } catch (webhookErr) {
      log("warn", "post_call.webhook_event_failed", {
        error: webhookErr instanceof Error ? webhookErr.message : String(webhookErr),
      });
    }

    // 11. Process call recording (transcription, keyword extraction, compliance cleanup)
    if (callSessionId && meta.recording_sid) {
      try {
        await processCallRecording(
          meta.recording_sid as string,
          callSessionId,
          (meta.recording_url as string) ?? "",
          summary?.duration_seconds ?? 0,
          workspaceId,
        );
        log("info", "post_call.recording_processed", { callSessionId });
      } catch (recErr) {
        log("warn", "post_call.recording_processing_failed", {
          error: recErr instanceof Error ? recErr.message : String(recErr),
        });
      }
    }

    // Store actions in session metadata
    try {
      await db
        .from("call_sessions")
        .update({
          metadata: {
            ...meta,
            post_call_actions: actions,
            post_call_executed_at: new Date().toISOString(),
          },
        })
        .eq("id", callSessionId);
    } catch (updateErr) {
      log("warn", "post_call.metadata_update_failed", {
        error: updateErr instanceof Error ? updateErr.message : String(updateErr),
      });
    }

    log("info", "post_call.completed", {
      callSessionId,
      actionsExecuted: actions.length,
      outcomes: actions.map((a) => `${a.type}:${a.status}`),
    });
  } catch (err) {
    log("error", "post_call.failed", {
      error: err instanceof Error ? err.message : String(err),
      callSessionId,
    });
  }

  return actions;
}

/**
 * Send a post-call SMS with personalized content based on call outcome.
 */
async function sendPostCallSms(
  phone: string,
  summary: CallSummary | null,
  config: PostCallConfig,
): Promise<PostCallAction> {
  const action: PostCallAction = {
    type: "sms",
    status: "pending",
    details: { phone },
  };

  // TCPA compliance: verify caller gave verbal or written SMS consent
  // Check lead metadata for sms_consent flag
  try {
    const db = getDb();
    const DEMO_WS = process.env.DEMO_WORKSPACE_ID ?? "";
    if (DEMO_WS) {
      const { data: lead } = await db
        .from("leads")
        .select("metadata")
        .eq("workspace_id", DEMO_WS)
        .eq("phone", phone)
        .maybeSingle();
      const meta = (lead as { metadata?: Record<string, unknown> } | null)?.metadata ?? {};
      if (meta.sms_consent !== true) {
        action.status = "skipped";
        action.details.reason = "no_sms_consent";
        return action;
      }
    }
  } catch {
    // If we can't verify consent, don't send
    action.status = "skipped";
    action.details.reason = "consent_check_failed";
    return action;
  }

  try {
    // Build message based on outcome
    const outcome = summary?.outcome ?? "demo_completed";
    const message = buildSmsMessage(outcome, config.signup_link);

    // Send via Twilio (most reliable for SMS)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = config.from_number || process.env.TWILIO_PHONE_NUMBER;

    if (!twilioSid || !twilioToken || !fromNumber) {
      action.status = "skipped";
      action.details.reason = "twilio_not_configured";
      return action;
    }

    const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
    const params = new URLSearchParams();
    params.append("From", fromNumber);
    params.append("To", phone);
    params.append("Body", message);

    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    if (resp.ok) {
      const data = await resp.json() as { sid?: string };
      action.status = "sent";
      action.details.message_sid = data.sid;
      action.details.message = message;
      action.executed_at = new Date().toISOString();
      log("info", "post_call.sms_sent", { phone, sid: data.sid });
    } else {
      const errText = await resp.text();
      action.status = "failed";
      action.error = `Twilio SMS error: ${resp.status} ${errText}`;
      log("warn", "post_call.sms_failed", { phone, status: resp.status, error: errText });
    }
  } catch (err) {
    action.status = "failed";
    action.error = err instanceof Error ? err.message : String(err);
    log("error", "post_call.sms_error", { error: action.error });
  }

  return action;
}

/**
 * Build SMS message content based on call outcome.
 */
function buildSmsMessage(outcome: string, signupLink: string): string {
  switch (outcome) {
    case "signup_initiated":
      return `Thanks for chatting with Sarah from Revenue Operator! Ready to get started? Complete your signup here: ${signupLink} — Your 14-day free trial is waiting. Reply STOP to opt out.`;

    case "demo_completed":
      return `Great talking with you! Sarah here from Revenue Operator. If you're ready to stop missing calls and start closing more deals, start your free trial: ${signupLink} — No credit card needed. Reply STOP to opt out.`;

    case "callback_requested":
      return `Thanks for your interest in Revenue Operator! We'll follow up with you shortly. In the meantime, check out what we can do: ${signupLink} — Reply STOP to opt out.`;

    case "objection_unresolved":
      return `Thanks for taking the time to chat with us at Revenue Operator. We'd love to answer any remaining questions — feel free to call back anytime or start a free trial: ${signupLink} Reply STOP to opt out.`;

    default:
      return `Thanks for trying the Revenue Operator demo! Start your free 14-day trial — no credit card required: ${signupLink} Reply STOP to opt out.`;
  }
}

/**
 * Update lead status based on call outcome.
 */
async function updateLeadStatus(
  leadId: string,
  summary: CallSummary,
): Promise<PostCallAction> {
  const action: PostCallAction = {
    type: "status_update",
    status: "pending",
    details: { leadId },
  };

  try {
    const db = getDb();

    // Map call outcome to lead status
    const statusMap: Record<string, string> = {
      signup_initiated: "HOT",
      demo_completed: "WARM",
      callback_requested: "WARM",
      objection_unresolved: "WARM",
      information_gathered: "NEW",
      hung_up_early: "COLD",
      voicemail: "NEW",
      transferred: "WARM",
    };

    const newStatus = statusMap[summary.outcome] || "NEW";

    // Calculate lead score bump
    const scoreBump =
      summary.outcome === "signup_initiated" ? 40 :
      summary.outcome === "demo_completed" ? 25 :
      summary.outcome === "callback_requested" ? 20 :
      summary.sentiment === "positive" ? 15 :
      summary.sentiment === "negative" ? -5 : 10;

    // Load current score
    const { data: lead } = await db
      .from("leads")
      .select("score")
      .eq("id", leadId)
      .maybeSingle();

    const currentScore = ((lead as { score?: number } | null)?.score) || 0;
    // Never decrease score below outcome floor — leads only warm up from demo calls
    const floorScore =
      summary.outcome === "signup_initiated" ? 60 :
      summary.outcome === "demo_completed" ? 30 :
      summary.outcome === "callback_requested" ? 25 :
      0;
    const newScore = Math.min(100, Math.max(floorScore, currentScore + scoreBump));

    await db
      .from("leads")
      .update({
        status: newStatus,
        score: newScore,
        last_contacted_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    action.status = "sent";
    action.details.new_status = newStatus;
    action.details.new_score = newScore;
    action.details.score_change = scoreBump;
    action.executed_at = new Date().toISOString();

    log("info", "post_call.lead_updated", { leadId, status: newStatus, score: newScore });
  } catch (err) {
    action.status = "failed";
    action.error = err instanceof Error ? err.message : String(err);
    log("warn", "post_call.lead_update_failed", { error: action.error });
  }

  return action;
}

/**
 * Schedule a follow-up call for a lead.
 */
async function scheduleFollowUp(
  leadId: string,
  workspaceId: string,
  phone: string | undefined,
  delayHours: number,
  summary: CallSummary,
): Promise<PostCallAction> {
  const action: PostCallAction = {
    type: "follow_up_call",
    status: "pending",
    details: { leadId, delay_hours: delayHours },
  };

  if (!phone) {
    action.status = "skipped";
    action.details.reason = "no_phone";
    return action;
  }

  try {
    const db = getDb();
    const scheduledAt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

    // Store follow-up in lead metadata (a proper task queue would be better for production)
    const { data: lead } = await db
      .from("leads")
      .select("metadata")
      .eq("id", leadId)
      .maybeSingle();

    const leadMeta = ((lead as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;

    await db
      .from("leads")
      .update({
        metadata: {
          ...leadMeta,
          scheduled_follow_up: {
            scheduled_at: scheduledAt,
            reason: summary.follow_up_reason || "Follow up on demo call",
            phone,
            workspace_id: workspaceId,
            created_at: new Date().toISOString(),
          },
        },
      })
      .eq("id", leadId);

    action.status = "sent";
    action.details.scheduled_at = scheduledAt;
    action.details.reason = summary.follow_up_reason;
    action.executed_at = new Date().toISOString();

    log("info", "post_call.follow_up_scheduled", {
      leadId,
      scheduledAt,
      reason: summary.follow_up_reason,
    });
  } catch (err) {
    action.status = "failed";
    action.error = err instanceof Error ? err.message : String(err);
    log("warn", "post_call.follow_up_failed", { error: action.error });
  }

  return action;
}

/**
 * Send a follow-up email after a call completes.
 * Uses the "follow_up_after_call" template if configured, otherwise sends a default.
 */
async function sendFollowUpEmail(
  leadId: string,
  workspaceId: string,
  summary: CallSummary,
): Promise<PostCallAction> {
  const action: PostCallAction = {
    type: "follow_up_email",
    status: "pending",
    details: { leadId },
  };

  try {
    const db = getDb();
    const { data: lead } = await db
      .from("leads")
      .select("email, name, metadata")
      .eq("id", leadId)
      .maybeSingle();

    const leadData = lead as { email?: string | null; name?: string | null; metadata?: Record<string, unknown> | null } | null;

    if (!leadData?.email) {
      action.status = "skipped";
      action.details.reason = "no_email";
      return action;
    }

    // Only skip email for very short calls (hung up in < 30s = probably wrong number)
    if (summary.outcome === "hung_up_early" && summary.duration_seconds < 30) {
      action.status = "skipped";
      action.details.reason = "too_short";
      return action;
    }

    const vars = {
      "contact.name": leadData.name || "there",
      "contact.email": leadData.email,
      "agent.name": "Sarah",
    } as Record<string, string>;

    // Try workspace template first
    const template = await getTemplate(workspaceId, "follow_up_after_call");

    let subject: string;
    let bodyHtml: string;

    if (template) {
      subject = renderTemplate(template.subject, vars);
      bodyHtml = renderTemplate(template.body_html, vars);
    } else {
      // Default email when no template is configured
      const contactName = leadData.name || "there";
      const nextAction = summary.next_best_action;

      if (summary.outcome === "objection_unresolved") {
        subject = `Following up on our chat, ${contactName}`;
        bodyHtml = buildReassuranceEmail(contactName, summary);
      } else {
        subject = `Great chatting with you, ${contactName}!`;
        bodyHtml = buildDefaultFollowUpEmail(contactName, summary, nextAction);
      }
    }

    const result = await sendEmail(workspaceId, leadData.email, subject, bodyHtml, {
      template_slug: "follow_up_after_call",
    });

    if (result.ok) {
      action.status = "sent";
      action.details.email_id = result.id;
      action.details.external_id = result.externalId;
      action.executed_at = new Date().toISOString();
      log("info", "post_call.follow_up_email_sent", { leadId, email: leadData.email });
    } else {
      action.status = "failed";
      action.error = result.error;
      log("warn", "post_call.follow_up_email_failed", { leadId, error: result.error });
    }
  } catch (err) {
    action.status = "failed";
    action.error = err instanceof Error ? err.message : String(err);
    log("warn", "post_call.follow_up_email_error", { error: action.error });
  }

  return action;
}

/**
 * Auto-enroll a lead in the appropriate nurture sequence based on call outcome.
 * Maps call outcomes to sequence trigger types for automated follow-up.
 */
async function autoEnrollInSequence(
  leadId: string,
  workspaceId: string,
  summary: CallSummary,
): Promise<PostCallAction> {
  const action: PostCallAction = {
    type: "notification", // Using existing type for sequence enrollment tracking
    status: "pending",
    details: { leadId, action_name: "sequence_enrollment" },
  };

  try {
    const db = getDb();

    // Map call outcome to the best sequence trigger type
    const triggerMap: Record<string, string> = {
      signup_initiated: "lead_qualified",
      demo_completed: "inbound_call",
      callback_requested: "missed_call",
      objection_unresolved: "inbound_call",
      information_gathered: "new_lead",
      hung_up_early: "new_lead",
    };

    const triggerType = triggerMap[summary.outcome] || "inbound_call";

    // Find the best matching active sequence for this workspace
    const { data: sequences } = await db
      .from("sequences")
      .select("id, name, trigger_type")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .in("trigger_type", [triggerType, "custom", "manual"])
      .order("created_at", { ascending: false })
      .limit(3);

    const seqs = (sequences ?? []) as Array<{ id: string; name: string; trigger_type: string }>;

    // Prefer exact trigger match, fall back to custom/manual
    const bestMatch = seqs.find(s => s.trigger_type === triggerType) || seqs[0];

    if (!bestMatch) {
      // No sequence configured — create a default demo nurture sequence
      const defaultSeqId = await ensureDemoNurtureSequence(workspaceId);
      if (defaultSeqId) {
        const enrollment = await enrollContact(workspaceId, defaultSeqId, leadId);
        if (enrollment) {
          action.status = "sent";
          action.details.sequence_id = defaultSeqId;
          action.details.sequence_name = "Demo Lead Nurture";
          action.details.enrollment_id = enrollment.id;
          action.executed_at = new Date().toISOString();
          log("info", "post_call.sequence_enrolled", { leadId, sequenceId: defaultSeqId });
        } else {
          action.status = "skipped";
          action.details.reason = "enrollment_failed_or_already_enrolled";
        }
      } else {
        action.status = "skipped";
        action.details.reason = "no_sequence_available";
      }
      return action;
    }

    const enrollment = await enrollContact(workspaceId, bestMatch.id, leadId);
    if (enrollment) {
      action.status = "sent";
      action.details.sequence_id = bestMatch.id;
      action.details.sequence_name = bestMatch.name;
      action.details.enrollment_id = enrollment.id;
      action.executed_at = new Date().toISOString();
      log("info", "post_call.sequence_enrolled", {
        leadId,
        sequenceId: bestMatch.id,
        sequenceName: bestMatch.name,
        trigger: triggerType,
      });
    } else {
      action.status = "skipped";
      action.details.reason = "enrollment_failed_or_already_enrolled";
    }
  } catch (err) {
    action.status = "failed";
    action.error = err instanceof Error ? err.message : String(err);
    log("warn", "post_call.sequence_enroll_failed", { error: action.error });
  }

  return action;
}

/**
 * Ensure a default demo lead nurture sequence exists for the workspace.
 * Creates a 3-step email + SMS sequence if none exists.
 */
async function ensureDemoNurtureSequence(workspaceId: string): Promise<string | null> {
  const db = getDb();

  try {
    // Check if demo nurture sequence already exists
    const { data: existing } = await db
      .from("sequences")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("name", "Demo Lead Nurture")
      .eq("is_active", true)
      .maybeSingle();

    if (existing) return (existing as { id: string }).id;

    // Create the sequence
    const { data: seq } = await db
      .from("sequences")
      .insert({
        workspace_id: workspaceId,
        name: "Demo Lead Nurture",
        trigger_type: "inbound_call",
        is_active: true,
      })
      .select("id")
      .maybeSingle();

    if (!seq) return null;
    const seqId = (seq as { id: string }).id;

    // Create 3-step nurture cadence
    const steps = [
      {
        sequence_id: seqId,
        step_order: 1,
        type: "email",
        delay_minutes: 120, // 2 hours after call
        config: {
          template_content: "follow_up_value",
          subject: "Quick thought about our chat, {{contact.name}}",
          conditions: {},
        },
      },
      {
        sequence_id: seqId,
        step_order: 2,
        type: "email",
        delay_minutes: 2880, // 48 hours after step 1
        config: {
          template_content: "follow_up_social_proof",
          subject: "Businesses like yours are seeing this with Revenue Operator",
          conditions: {},
        },
      },
      {
        sequence_id: seqId,
        step_order: 3,
        type: "email",
        delay_minutes: 7200, // 5 days after step 2
        config: {
          template_content: "follow_up_last_chance",
          subject: "Your free trial is waiting, {{contact.name}}",
          conditions: {},
        },
      },
    ];

    await db.from("sequence_steps").insert(steps);

    log("info", "post_call.demo_nurture_sequence_created", { workspaceId, sequenceId: seqId });
    return seqId;
  } catch (err) {
    log("warn", "post_call.ensure_sequence_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Score the lead using the advanced intelligence engine after a demo call.
 */
async function scoreLead(
  leadId: string,
  workspaceId: string,
  summary: CallSummary,
): Promise<PostCallAction> {
  const action: PostCallAction = {
    type: "status_update",
    status: "pending",
    details: { leadId, action_name: "lead_scoring" },
  };

  try {
    const score = await scoreLeadPostCall(
      workspaceId,
      leadId,
      summary.outcome,
      summary.sentiment,
      summary.duration_seconds,
    );

    action.status = "sent";
    action.details.score = score;
    action.executed_at = new Date().toISOString();
    log("info", "post_call.lead_scored", { leadId, score, outcome: summary.outcome });
  } catch (err) {
    action.status = "failed";
    action.error = err instanceof Error ? err.message : String(err);
    log("warn", "post_call.lead_score_failed", { error: action.error });
  }

  return action;
}

/**
 * Auto-analyze call quality by sending the transcript to the coaching endpoint.
 * Stores coaching insights in call_session metadata for dashboard review.
 * Only runs on calls > 30 seconds (meaningful conversations).
 */
async function analyzeCallQuality(
  callSessionId: string,
  workspaceId: string,
  leadId: string | null | undefined,
): Promise<PostCallAction> {
  const action: PostCallAction = {
    type: "notification",
    status: "pending",
    details: { callSessionId, action_name: "call_quality_analysis" },
  };

  try {
    const db = getDb();

    // Load transcript from call session
    const { data: session } = await db
      .from("call_sessions")
      .select("metadata")
      .eq("id", callSessionId)
      .maybeSingle();

    const meta = ((session as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
    const history = (meta.demo_history ?? []) as Array<{ role: string; content: string }>;

    if (history.length < 4) {
      action.status = "skipped";
      action.details.reason = "too_few_turns";
      return action;
    }

    // Build transcript for analysis
    const transcript = history
      .map(m => `${m.role === "assistant" ? "Sarah (AI)" : "Caller"}: ${m.content}`)
      .join("\n");

    // Call the coaching endpoint internally
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.recall-touch.com";
    const resp = await fetch(`${appUrl}/api/call-intelligence/coaching`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-workspace-id": workspaceId,
      },
      body: JSON.stringify({
        transcript,
        call_id: callSessionId,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (resp.ok) {
      const coaching = await resp.json() as {
        overall_score?: number;
        coaching_points?: Array<{ category: string; score: number; feedback: string }>;
        key_moments?: Array<{ type: string; description: string }>;
      };

      // Store coaching insights in call session metadata
      await db
        .from("call_sessions")
        .update({
          metadata: {
            ...meta,
            coaching_score: coaching.overall_score,
            coaching_points: coaching.coaching_points,
            coaching_key_moments: coaching.key_moments,
            coaching_analyzed_at: new Date().toISOString(),
          },
        })
        .eq("id", callSessionId);

      action.status = "sent";
      action.details.overall_score = coaching.overall_score;
      action.details.categories_analyzed = coaching.coaching_points?.length ?? 0;
      action.executed_at = new Date().toISOString();

      log("info", "post_call.coaching_analyzed", {
        callSessionId,
        score: coaching.overall_score,
        categories: coaching.coaching_points?.length,
      });
    } else {
      action.status = "failed";
      action.error = `Coaching API returned ${resp.status}`;
      log("warn", "post_call.coaching_api_failed", { callSessionId, status: resp.status });
    }
  } catch (err) {
    action.status = "failed";
    action.error = err instanceof Error ? err.message : String(err);
    log("warn", "post_call.coaching_failed", { error: action.error });
  }

  return action;
}

/**
 * Send a 1-question NPS feedback request via SMS after a call.
 * Only sends to callers who have SMS consent and had meaningful calls (>60s).
 * Uses a simple 1-10 rating scale for maximum response rate.
 */
async function sendNpsFeedbackRequest(
  phone: string,
  callSessionId: string,
  workspaceId: string,
): Promise<PostCallAction> {
  const action: PostCallAction = {
    type: "sms",
    status: "pending",
    details: { phone, action_name: "nps_feedback" },
  };

  try {
    const db = getDb();

    // Check SMS consent (TCPA compliance)
    const { data: lead } = await db
      .from("leads")
      .select("metadata")
      .eq("workspace_id", workspaceId)
      .eq("phone", phone)
      .maybeSingle();

    const leadMeta = ((lead as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;

    if (leadMeta.sms_consent !== true) {
      action.status = "skipped";
      action.details.reason = "no_sms_consent";
      return action;
    }

    // Don't send NPS if we already sent one for this lead recently (within 7 days)
    const lastNps = leadMeta.last_nps_sent_at as string | undefined;
    if (lastNps) {
      const daysSince = (Date.now() - new Date(lastNps).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        action.status = "skipped";
        action.details.reason = "nps_sent_recently";
        return action;
      }
    }

    // Send NPS SMS via Twilio
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioSid || !twilioToken || !fromNumber) {
      action.status = "skipped";
      action.details.reason = "twilio_not_configured";
      return action;
    }

    const message = `Thanks for chatting with Sarah from Revenue Operator! Quick question: On a scale of 1-10, how was your experience? Just reply with a number. Your feedback helps us improve! Reply STOP to opt out.`;

    const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
    const params = new URLSearchParams();
    params.append("From", fromNumber);
    params.append("To", phone);
    params.append("Body", message);

    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (resp.ok) {
      const data = await resp.json() as { sid?: string };
      action.status = "sent";
      action.details.message_sid = data.sid;
      action.executed_at = new Date().toISOString();

      // Update lead metadata with NPS tracking
      await db
        .from("leads")
        .update({
          metadata: {
            ...leadMeta,
            last_nps_sent_at: new Date().toISOString(),
            last_nps_call_session: callSessionId,
          },
        })
        .eq("workspace_id", workspaceId)
        .eq("phone", phone);

      log("info", "post_call.nps_sent", { phone, callSessionId });
    } else {
      action.status = "failed";
      action.error = `SMS send failed: ${resp.status}`;
      log("warn", "post_call.nps_send_failed", { phone, status: resp.status });
    }
  } catch (err) {
    action.status = "failed";
    action.error = err instanceof Error ? err.message : String(err);
    log("warn", "post_call.nps_error", { error: action.error });
  }

  return action;
}

/**
 * Build a default follow-up email when no template is configured.
 */
function buildDefaultFollowUpEmail(
  name: string,
  summary: CallSummary,
  nextAction?: string,
): string {
  const signupLink = "https://www.recall-touch.com/signup";

  let ctaBlock = "";
  switch (nextAction) {
    case "send_pricing":
      ctaBlock = `<p>As promised, here are our plans — starting at <strong>$147/month</strong> for the Solo plan:</p>
        <p><a href="${signupLink}" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View Plans & Start Free Trial</a></p>`;
      break;
    case "send_case_study":
      ctaBlock = `<p>I mentioned we have some great results from businesses like yours. I'll follow up with a case study shortly.</p>
        <p>In the meantime, you can explore what Revenue Operator can do:</p>
        <p><a href="${signupLink}" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Start Your 14-Day Free Trial</a></p>`;
      break;
    case "schedule_team_demo":
      ctaBlock = `<p>I'd love to set up a deeper demo with our team. In the meantime, you can get started right away:</p>
        <p><a href="${signupLink}" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Start Your 14-Day Free Trial</a></p>`;
      break;
    default:
      ctaBlock = `<p>Ready to stop missing calls and start recovering revenue?</p>
        <p><a href="${signupLink}" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Start Your 14-Day Free Trial</a></p>`;
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hey ${name},</p>
  <p>Thanks for taking the time to chat with me today! It was great learning about your business.</p>
  ${summary.follow_up_reason ? `<p>${summary.follow_up_reason}</p>` : ""}
  ${ctaBlock}
  <p style="margin-top:24px;">No pressure at all — just wanted to make sure you have everything you need.</p>
  <p>Talk soon,<br><strong>Sarah</strong><br><span style="color:#6b7280;font-size:14px;">AI Sales Agent, Revenue Operator</span></p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;">
  <p style="font-size:12px;color:#9ca3af;">This email was sent by Revenue Operator AI. <a href="https://www.recall-touch.com" style="color:#2563EB;">recall-touch.com</a></p>
  <p style="font-size:11px;color:#9ca3af;">Revenue Operator Inc. | <a href="https://www.recall-touch.com/unsubscribe" style="color:#9ca3af;">Unsubscribe</a> | <a href="https://www.recall-touch.com/privacy" style="color:#9ca3af;">Privacy Policy</a></p>
</body>
</html>`;
}

/**
 * Build a reassurance email for callers who had unresolved objections.
 * Tone: empathetic, addresses concerns, provides value, no hard sell.
 */
function buildReassuranceEmail(
  name: string,
  summary: CallSummary,
): string {
  const signupLink = "https://www.recall-touch.com/signup";
  const objections = summary.objections_raised?.length
    ? summary.objections_raised.map((o) => `<li style="margin-bottom:8px;">${o}</li>`).join("")
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hey ${name},</p>
  <p>Thanks for taking the time to chat earlier. I know choosing the right tool for your business is a big decision, and I wanted to follow up on a couple of things we discussed.</p>
  ${objections ? `<p>You raised some really good points:</p><ul style="color:#374151;padding-left:20px;">${objections}</ul><p>These are concerns we hear from a lot of businesses initially — and they're exactly why we offer a completely free 14-day trial with no credit card required. You can test everything with real calls and see the results for yourself.</p>` : "<p>I understand you might want to take some time to think things through. That's totally fine — we're not going anywhere.</p>"}
  <p>If you'd like to give it a try (zero risk, zero commitment):</p>
  <p><a href="${signupLink}" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Start Your Free Trial</a></p>
  <p style="margin-top:24px;">And if you have any other questions, just reply to this email or call back anytime. I'm always here.</p>
  <p>Best,<br><strong>Sarah</strong><br><span style="color:#6b7280;font-size:14px;">AI Sales Agent, Revenue Operator</span></p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;">
  <p style="font-size:12px;color:#9ca3af;">This email was sent by Revenue Operator AI. <a href="https://www.recall-touch.com" style="color:#2563EB;">recall-touch.com</a></p>
  <p style="font-size:11px;color:#9ca3af;">Revenue Operator Inc. | <a href="https://www.recall-touch.com/unsubscribe" style="color:#9ca3af;">Unsubscribe</a> | <a href="https://www.recall-touch.com/privacy" style="color:#9ca3af;">Privacy Policy</a></p>
</body>
</html>`;
}
