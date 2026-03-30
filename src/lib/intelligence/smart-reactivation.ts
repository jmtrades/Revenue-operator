/**
 * Smart Reactivation Engine — Intelligence-driven lead reactivation
 * Uses Lead Brain to decide when, how, and with what angle to reactivate leads.
 * Deterministic rules; no freeform AI.
 */

import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { computeLeadIntelligence } from "./lead-brain";
import { getLeadMemory } from "@/lib/lead-memory";

export type ReactivationTrigger =
  | "time_based"          // Standard horizon-based (1,3,7,14,30,90 days)
  | "outcome_driven"      // Triggered by specific outcome (no_show, cancelled, etc.)
  | "engagement_decay"    // Detected engagement drop
  | "competitor_signal"   // Lead mentioned competitor/alternative
  | "seasonal"            // Calendar-based (holidays, end-of-quarter, etc.)
  | "event_based";        // External event (price change, new feature, etc.)

export interface SmartReactivationDecision {
  should_reactivate: boolean;
  trigger: ReactivationTrigger;
  angle: string;           // value, clarification, proof, urgency, closure, or custom
  channel: "sms" | "email" | "call" | "multi";
  delay_hours: number;
  message_context: {
    last_outcome: string | null;
    days_inactive: number;
    previous_angles_used: string[];
    objections_recorded: string[];
  };
  reason: string;
  confidence: number;
}

/**
 * Decide whether and how to reactivate a lead using lead intelligence.
 * Rules:
 * - churn_risk > 0.8 && days_inactive > 30 → don't reactivate (too far gone)
 * - churn_risk > 0.6 && days_inactive > 14 → reactivate with "closure" angle
 * - last_outcome == "no_show" → "value" angle, shorter delay
 * - last_outcome == "appointment_cancelled" → "clarification" angle
 * - engagement_score < 30 && days_inactive 3-7 → "proof" angle
 * - engagement_score >= 50 && days_inactive 1-3 → "urgency" angle
 * - objections recorded → choose angle that addresses objection
 * - Rotate angles: don't repeat same angle consecutively
 */
export async function decideSmartReactivation(
  workspaceId: string,
  leadId: string
): Promise<SmartReactivationDecision> {
  const db = getDb();

  try {
    // 1. Compute lead intelligence
    const intelligence = await computeLeadIntelligence(workspaceId, leadId);

    // 2. Fetch lead memory (objections, commitments, emotional profile)
    const memory = await getLeadMemory(workspaceId, leadId);

    // 3. Fetch previous reactivation attempts
    const { data: previousActions } = await db
      .from("autonomous_actions")
      .select("action_type, action_metadata, created_at")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId)
      .eq("action_type", "reactivation")
      .order("created_at", { ascending: false })
      .limit(5);

    const previousAttempts = (previousActions ?? []) as Array<{
      action_metadata?: { angle?: string };
      created_at?: string;
    }>;
    const previousAngles = previousAttempts
      .slice(0, 3)
      .map((a) => a.action_metadata?.angle)
      .filter(Boolean) as string[];

    // 4. Compute days inactive
    const lastContactTime = new Date(intelligence.last_contact_at ?? new Date().toISOString());
    const daysInactive = Math.floor(
      (Date.now() - lastContactTime.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 5. Apply decision rules
    // Rule: too far gone
    if (intelligence.churn_risk > 0.8 && daysInactive > 30) {
      return {
        should_reactivate: false,
        trigger: "time_based",
        angle: "none",
        channel: "email",
        delay_hours: 0,
        message_context: {
          last_outcome: intelligence.last_outcome,
          days_inactive: daysInactive,
          previous_angles_used: previousAngles,
          objections_recorded: memory?.objections_history_json?.map((o: { tag: string }) => o.tag) ?? [],
        },
        reason: "Churn risk too high; lead too far gone for reactivation",
        confidence: 0.9,
      };
    }

    // Determine trigger
    let trigger: ReactivationTrigger = "time_based";
    let angle = "value"; // default

    // Rule: closure angle for high churn risk
    if (intelligence.churn_risk > 0.6 && daysInactive > 14) {
      angle = "closure";
      trigger = "outcome_driven";
    }
    // Rule: no_show outcome
    else if (intelligence.last_outcome === "no_show") {
      angle = "value";
      trigger = "outcome_driven";
    }
    // Rule: appointment cancelled
    else if (intelligence.last_outcome === "appointment_cancelled") {
      angle = "clarification";
      trigger = "outcome_driven";
    }
    // Rule: low engagement, recent inactivity
    else if (intelligence.engagement_score < 30 && daysInactive >= 3 && daysInactive <= 7) {
      angle = "proof";
      trigger = "engagement_decay";
    }
    // Rule: high engagement, very recent inactivity
    else if (intelligence.engagement_score >= 50 && daysInactive >= 1 && daysInactive <= 3) {
      angle = "urgency";
      trigger = "time_based";
    }

    // Handle objections: choose angle that addresses them
    if (memory?.objections_history_json && memory.objections_history_json.length > 0) {
      const objectionCategories = memory.objections_history_json.map((o) => o.tag);
      if (objectionCategories.includes("price") || objectionCategories.includes("cost")) {
        angle = "proof"; // proof of ROI/value
      } else if (objectionCategories.includes("timing") || objectionCategories.includes("not_ready")) {
        angle = "value"; // value for later
      } else if (objectionCategories.includes("features")) {
        angle = "clarification"; // clarify features
      }
    }

    // Rotate angles: avoid repeating same angle
    if (previousAngles.includes(angle) && previousAngles.length > 0) {
      const angles = ["value", "clarification", "proof", "urgency", "closure"];
      const available = angles.filter((a) => !previousAngles.includes(a));
      if (available.length > 0) {
        angle = available[0];
      }
    }

    // 6. Determine channel
    let channel: "sms" | "email" | "call" | "multi" = "email";
    if (daysInactive <= 3) {
      channel = intelligence.engagement_score >= 50 ? "sms" : "email";
    } else if (daysInactive > 7 && intelligence.engagement_score >= 60) {
      channel = "multi";
    } else if (daysInactive > 14) {
      channel = "email";
    }

    // 7. Determine delay
    // Min 4 hours, max 72 hours; proportional to days inactive
    let delayHours = Math.min(72, Math.max(4, daysInactive * 2));
    if (intelligence.last_outcome === "no_show" || intelligence.last_outcome === "appointment_cancelled") {
      delayHours = Math.min(delayHours, 24); // Shorter for outcome-driven
    }

    // 8. Compute confidence
    let confidence = 0.7; // Base
    if (intelligence.engagement_score >= 60) confidence += 0.15;
    if (previousAngles.length === 0) confidence += 0.1;
    if (memory?.objections_history_json && memory.objections_history_json.length > 0) confidence += 0.05;
    confidence = Math.min(0.99, confidence);

    return {
      should_reactivate: true,
      trigger,
      angle,
      channel,
      delay_hours: delayHours,
      message_context: {
        last_outcome: intelligence.last_outcome,
        days_inactive: daysInactive,
        previous_angles_used: previousAngles,
        objections_recorded: memory?.objections_history_json?.map((o: { tag: string }) => o.tag) ?? [],
      },
      reason: `Reactivate with ${angle} angle; engagement=${intelligence.engagement_score}, churn_risk=${intelligence.churn_risk}`,
      confidence,
    };
  } catch (err) {
    console.error("[smart-reactivation] decideSmartReactivation error:", err);
    throw err;
  }
}

/**
 * Execute smart reactivation: send message, log action, update lead state.
 */
export async function executeSmartReactivation(
  workspaceId: string,
  leadId: string,
  decision: SmartReactivationDecision
): Promise<{ success: boolean; details: string }> {
  const db = getDb();

  if (!decision.should_reactivate) {
    return { success: false, details: "Decision indicates no reactivation needed" };
  }

  try {
    // 1. Log autonomous action
    const now = new Date().toISOString();
    await db.from("autonomous_actions").insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      action_type: "reactivation",
      action_metadata: {
        trigger: decision.trigger,
        angle: decision.angle,
        channel: decision.channel,
        delay_hours: decision.delay_hours,
        confidence: decision.confidence,
      },
      status: "executed",
      executed_at: now,
    });

    // 2. Enqueue reactivation job
    await enqueue({
      type: "reactivation",
      leadId,
    });

    // 3. Update lead state
    await db
      .from("leads")
      .update({
        reactivation_attempt_at: now,
        reactivation_angle: decision.angle,
        updated_at: now,
      })
      .eq("id", leadId)
      .eq("workspace_id", workspaceId);

    return {
      success: true,
      details: `Reactivation queued: angle=${decision.angle}, channel=${decision.channel}, delay=${decision.delay_hours}h`,
    };
  } catch (err) {
    console.error("[smart-reactivation] executeSmartReactivation error:", err);
    return {
      success: false,
      details: `Execution failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Run smart reactivation sweep: find leads due for reactivation, decide, and execute.
 * Returns counts of processed and reactivated leads.
 */
export async function runSmartReactivationSweep(
  workspaceId?: string
): Promise<{ processed: number; reactivated: number }> {
  const db = getDb();
  let processed = 0;
  let reactivated = 0;

  try {
    // 1. Query leads in REACTIVATE, CONTACTED, ENGAGED states not recently contacted
    const statesForReactivation = ["REACTIVATE", "CONTACTED", "ENGAGED"];
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    let query = db
      .from("leads")
      .select("id, workspace_id, last_activity_at, opt_out")
      .in("state", statesForReactivation)
      .eq("opt_out", false);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data: leads } = await query.lt("last_activity_at", fourteenDaysAgo).limit(100);

    // 2. For each lead, compute decision and execute if reactivation needed
    for (const lead of leads ?? []) {
      const l = lead as { id: string; workspace_id: string; last_activity_at: string };
      processed++;

      try {
        const decision = await decideSmartReactivation(l.workspace_id, l.id);

        if (decision.should_reactivate) {
          const result = await executeSmartReactivation(l.workspace_id, l.id, decision);
          if (result.success) {
            reactivated++;
          }
        }
      } catch (err) {
        console.error(
          `[smart-reactivation] Error processing lead ${l.id}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    return { processed, reactivated };
  } catch (err) {
    console.error("[smart-reactivation] runSmartReactivationSweep error:", err);
    return { processed, reactivated };
  }
}
