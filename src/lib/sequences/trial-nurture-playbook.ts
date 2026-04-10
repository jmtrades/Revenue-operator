/**
 * Trial-to-Close Nurture Playbook System
 *
 * Automated touchpoints during the 30-day money-back guarantee period
 * to maximize activation, engagement, and retention.
 *
 * Uses the existing sequence engine (sequences, sequence_steps, sequence_enrollments)
 * to drive progressive value delivery and conversion.
 */

import { getDb } from "@/lib/db/queries";
import type { FollowUpSequence } from "./follow-up-engine";

export interface NurtureStep {
  day: number;                    // Day after signup (0-30)
  channel: "email" | "sms" | "in_app";
  trigger: "time" | "behavior" | "absence";
  subject?: string;               // Email subject line
  template: string;               // Template content/key
  delayMinutes: number;           // Delay from previous step in minutes
  conditions?: {                  // Only send if conditions met
    minCalls?: number;
    maxCalls?: number;
    hasAppointment?: boolean;
    lastLoginDaysAgo?: number;
    planTier?: string;
  };
}

/**
 * Generate a comprehensive trial nurture sequence for a new workspace.
 * Returns the 12-step sequence structured for the follow-up engine.
 */
export function generateTrialNurtureSequence(context: {
  businessName: string;
  industry?: string;
  planTier?: string;
  agentPhone?: string;
  signupDate: string;
}): NurtureStep[] {
  const _baseDate = new Date(context.signupDate);

  return [
    // Day 0 — Welcome & Setup
    {
      day: 0,
      channel: "email",
      trigger: "time",
      subject: "Welcome to Revenue Operator - Your AI Agent is Live",
      template: "trial_welcome_email",
      delayMinutes: 5,
    },
    {
      day: 0,
      channel: "sms",
      trigger: "time",
      template: `trial_welcome_sms:${context.agentPhone || "agent"}`,
      delayMinutes: 15,
    },

    // Day 1 — First Win Check
    {
      day: 1,
      channel: "email",
      trigger: "behavior",
      subject: "Did your first call come through?",
      template: "trial_first_win_check",
      delayMinutes: 24 * 60,
      conditions: { minCalls: 0, maxCalls: 10 },
    },

    // Day 3 — Activation Push
    {
      day: 3,
      channel: "email",
      trigger: "behavior",
      subject: "3 ways to get your AI agent working immediately",
      template: "trial_activation_push",
      delayMinutes: 3 * 24 * 60,
      conditions: { minCalls: 0 },
    },
    {
      day: 3,
      channel: "sms",
      trigger: "behavior",
      template: "trial_activation_sms",
      delayMinutes: 3 * 24 * 60 + 120,
      conditions: { minCalls: 0, lastLoginDaysAgo: 2 },
    },

    // Day 7 — Value Report
    {
      day: 7,
      channel: "email",
      trigger: "time",
      subject: "Your first week in numbers - here's your ROI",
      template: "trial_value_report_week1",
      delayMinutes: 7 * 24 * 60,
    },

    // Day 10 — Feature Discovery
    {
      day: 10,
      channel: "email",
      trigger: "time",
      subject: "3 powerful features you might have missed",
      template: "trial_feature_discovery",
      delayMinutes: 10 * 24 * 60,
    },

    // Day 14 — Milestone Check (Halfway Point)
    {
      day: 14,
      channel: "email",
      trigger: "time",
      subject: "Two weeks in - here's your revenue impact so far",
      template: "trial_milestone_week2",
      delayMinutes: 14 * 24 * 60,
    },
    {
      day: 14,
      channel: "sms",
      trigger: "time",
      template: "trial_milestone_sms",
      delayMinutes: 14 * 24 * 60 + 120,
    },

    // Day 21 — Social Proof & Case Study
    {
      day: 21,
      channel: "email",
      trigger: "time",
      subject: `${context.industry || "Businesses"} like yours are seeing incredible results`,
      template: "trial_social_proof",
      delayMinutes: 21 * 24 * 60,
    },

    // Day 25 — Pre-Expiry Warning (5 Days Left)
    {
      day: 25,
      channel: "email",
      trigger: "time",
      subject: "5 days left on your money-back guarantee",
      template: "trial_preexpiry_warning",
      delayMinutes: 25 * 24 * 60,
    },

    // Day 27 — Plan Upgrade / Expansion
    {
      day: 27,
      channel: "email",
      trigger: "behavior",
      subject: `Upgrade ${context.planTier || "your plan"} and unlock more power`,
      template: `trial_upgrade_${context.planTier?.toLowerCase() || "starter"}`,
      delayMinutes: 27 * 24 * 60,
    },

    // Day 30 — Final Retention (Guarantee Expires)
    {
      day: 30,
      channel: "email",
      trigger: "time",
      subject: "Your 30-day guarantee period ends today",
      template: "trial_final_retention",
      delayMinutes: 30 * 24 * 60,
    },
  ];
}

/**
 * Enroll a workspace in the trial nurture sequence.
 * Called automatically when a new workspace is created.
 *
 * Creates:
 * 1. A sequence record with trigger_type = "trial_nurture"
 * 2. 12 sequence_step records (one for each day/touch)
 *
 * Returns the created sequence ID.
 */
export async function enrollWorkspaceInTrialNurture(
  workspaceId: string,
  context: {
    businessName: string;
    industry?: string;
    planTier?: string;
    agentPhone?: string;
    signupDate: string;
  }
): Promise<string | null> {
  const db = getDb();

  try {
    // Create the sequence
    const { data: sequence, error: seqErr } = await db
      .from("sequences")
      .insert({
        workspace_id: workspaceId,
        name: `Trial Nurture - ${context.businessName}`,
        trigger_type: "trial_nurture",
        is_active: true,
      })
      .select("id")
      .maybeSingle();

    if (seqErr || !sequence) {
      console.error("[trial-nurture] Failed to create sequence:", seqErr);
      return null;
    }

    const sequenceId = (sequence as { id: string }).id;

    // Generate all nurture steps
    const steps = generateTrialNurtureSequence(context);

    // Convert to database records and insert in bulk
    const stepRecords = steps.map((step, index) => ({
      sequence_id: sequenceId,
      step_order: index + 1,
      type: step.channel,
      delay_minutes: step.delayMinutes,
      config: {
        template_content: step.template,
        subject: step.subject,
        trigger: step.trigger,
        conditions: step.conditions || {},
      },
    }));

    const { error: stepsErr } = await db
      .from("sequence_steps")
      .insert(stepRecords);

    if (stepsErr) {
      console.error("[trial-nurture] Failed to create steps:", stepsErr);
      // Clean up the sequence we just created
      await db.from("sequences").delete().eq("id", sequenceId);
      return null;
    }

    return sequenceId;
  } catch (error) {
    console.error("[trial-nurture] Enrollment failed:", error);
    return null;
  }
}

/**
 * Get all active trial nurture sequences for a workspace.
 */
export async function getWorkspaceTrialSequences(
  workspaceId: string
): Promise<FollowUpSequence[]> {
  const db = getDb();

  const { data: sequences, error } = await db
    .from("sequences")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("trigger_type", "trial_nurture")
    .eq("is_active", true);

  if (error) {
    console.error("[trial-nurture] Failed to fetch sequences:", error);
    return [];
  }

  return (sequences || []) as FollowUpSequence[];
}
