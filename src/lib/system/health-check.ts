/**
 * Pipeline health check: dry-run synthetic lead through signal → decision → action.
 * No real messages sent. Returns full trace for diagnostics.
 */

import { getDb } from "@/lib/db/queries";

export interface HealthCheckTrace {
  stage: string;
  ok: boolean;
  detail?: string;
  duration_ms?: number;
}

export interface HealthCheckResult {
  ok: boolean;
  trace: HealthCheckTrace[];
  error?: string;
}

export async function runPipelineHealthCheck(): Promise<HealthCheckResult> {
  const trace: HealthCheckTrace[] = [];
  const t0 = () => Date.now();

  try {
    let start = t0();
    const db = getDb();
    const { data: leadRow } = await db.from("leads").select("id, workspace_id").limit(1).maybeSingle();
    trace.push({ stage: "signal_enter", ok: true, detail: "db reachable", duration_ms: t0() - start });

    if (!leadRow) {
      trace.push({ stage: "decision", ok: true, detail: "no leads (skip decision)" });
      return { ok: true, trace };
    }

    const leadId = (leadRow as { id: string }).id;
    const workspaceId = (leadRow as { workspace_id: string }).workspace_id;

    start = t0();
    const { computeDealStateVector } = await import("@/lib/engines/perception");
    const stateVector = await computeDealStateVector(workspaceId, leadId);
    trace.push({ stage: "state_vector", ok: !!stateVector, detail: stateVector ? "computed" : "null", duration_ms: t0() - start });

    start = t0();
    const { decideIntervention } = await import("@/lib/engines/decision");
    const strategyState = null;
    const decision = stateVector ? await decideIntervention(workspaceId, leadId, stateVector, strategyState) : null;
    trace.push({ stage: "decision", ok: true, detail: decision?.intervene ? "intervene" : "no_intervene", duration_ms: t0() - start });

    start = t0();
    const { buildMessageFromIntervention } = await import("@/lib/engines/execution");
    const message = decision?.intervention_type
      ? buildMessageFromIntervention(decision, { leadName: "Test", company: undefined, capacity_pressure: 0 })
      : null;
    trace.push({ stage: "message_generate", ok: !!message || !decision?.intervene, detail: message ? "generated" : "skipped", duration_ms: t0() - start });

    start = t0();
    try {
      const { getCommitmentPressure } = await import("@/lib/guarantee/commitment-stability");
      await getCommitmentPressure(leadId);
      trace.push({ stage: "guarantee_eval", ok: true, detail: "commitment pressure", duration_ms: t0() - start });
    } catch (e) {
      trace.push({ stage: "guarantee_eval", ok: false, detail: e instanceof Error ? e.message : String(e), duration_ms: t0() - start });
    }

    start = t0();
    const { data: escRow } = await db.from("escalation_logs").select("id").eq("lead_id", leadId).limit(1).maybeSingle();
    trace.push({ stage: "handoff_trigger", ok: true, detail: escRow ? "escalation_logs readable" : "no handoffs", duration_ms: t0() - start });

    return { ok: trace.every((t) => t.ok), trace };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    trace.push({ stage: "health_check_error", ok: false, detail: error });
    return { ok: false, trace, error };
  }
}
