/**
 * Brain Trigger — hooks into signal processing to trigger autonomous intelligence.
 * Called after processCanonicalSignal completes successfully.
 * Non-blocking, errors don't propagate.
 */

import { computeLeadIntelligence, persistLeadIntelligence } from "./lead-brain";
import { executeAutonomousAction } from "./autonomous-executor";
import { ensureBrainTables } from "./brain-migration";

let _tablesEnsured = false;

export interface TriggerBrainParams {
  signalId: string;
  leadId: string;
  workspaceId: string;
  signalType: string;
}

/**
 * Trigger brain computation and action after signal is processed.
 * Non-blocking. Errors caught and logged.
 */
export async function triggerBrainAfterSignal(params: TriggerBrainParams): Promise<void> {
  try {
    const { signalId, leadId, workspaceId, signalType } = params;

    // Ensure tables exist (run once per process)
    if (!_tablesEnsured) {
      const result = await ensureBrainTables();
      _tablesEnsured = result.ok;
      if (!result.ok) {
        console.warn("[brain-trigger] ensureBrainTables failed:", result.error);
        // Continue anyway — table may already exist
      }
    }

    // 1. Compute lead intelligence
    const intelligence = await computeLeadIntelligence(workspaceId, leadId);

    // 2. Persist intelligence
    const persistResult = await persistLeadIntelligence(intelligence);
    if (!persistResult.ok) {
      console.warn("[brain-trigger] persistLeadIntelligence failed");
    }

    // 3. Execute autonomous action based on timing and confidence gates
    // - Immediate (safety/urgent): always execute (executor has its own 30% floor)
    // - Scheduled (normal cadence): 40% confidence minimum, no opt-out
    // The executor applies its own safety checks (daily limits, confidence floor, risk flags)
    // so the trigger gate should be permissive to let the executor make the final call.
    if (
      intelligence.action_timing === "immediate" ||
      (intelligence.action_timing === "scheduled" &&
        intelligence.action_confidence >= 0.4 &&
        !intelligence.risk_flags.includes("opt_out_signal"))
    ) {
      await executeAutonomousAction(intelligence);
    }

    // 4. Log trigger event (non-blocking)
    try {
      const { getDb } = await import("@/lib/db/queries");
      const db = getDb();
      await db.from("autonomous_actions").insert({
        lead_id: leadId,
        workspace_id: workspaceId,
        action_type: "brain_computed",
        success: true,
        details: `Brain computed for signal ${signalType}`,
        confidence: intelligence.action_confidence,
        reason: `Triggered by signal: ${signalType}`,
        trigger_signal_id: signalId,
        intelligence_snapshot: intelligence as unknown as Record<string, unknown>,
        executed_at: new Date().toISOString(),
      });
    } catch (err) {
      // Silent
      console.error(
        "[brain-trigger] Failed to log trigger event:",
        err instanceof Error ? err.message : String(err)
      );
    }
  } catch (err) {
    // Non-blocking — log but don't throw
    console.error(
      "[brain-trigger] triggerBrainAfterSignal error:",
      err instanceof Error ? err.message : String(err)
    );
  }
}
