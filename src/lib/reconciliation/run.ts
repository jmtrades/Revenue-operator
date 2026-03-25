/**
 * Run all detectors for a workspace and emit discovered signals. No direct state mutation.
 */

import { getDb } from "@/lib/db/queries";
import { detectInboundGaps } from "./detect/inbound-gaps";
import { detectBookingDrift } from "./detect/booking-drift";
import { detectAttendanceTruth } from "./detect/attendance-truth";
import { detectHumanOverride } from "./detect/human-override";
import { detectPaymentDrift } from "./detect/payment-drift";
import { emitDiscoveredSignal } from "./emit";

const PAYMENTS_GATED = !!(process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY);
const MAX_SIGNALS_PER_LEAD_PER_RUN = 50;

function countByLead<T extends { lead_id: string }>(items: T[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of items) {
    m.set(c.lead_id, (m.get(c.lead_id) ?? 0) + 1);
  }
  return m;
}

function mergeCounts(maps: Map<string, number>[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of maps) {
    for (const [leadId, n] of m) {
      out.set(leadId, (out.get(leadId) ?? 0) + n);
    }
  }
  return out;
}

export async function runReconciliationForWorkspace(workspaceId: string): Promise<{ emitted: number; errors: string[] }> {
  const errors: string[] = [];
  let emitted = 0;

  const inbound = await detectInboundGaps(workspaceId).catch((e) => {
    errors.push(`inbound: ${e instanceof Error ? e.message : String(e)}`);
    return [] as Awaited<ReturnType<typeof detectInboundGaps>>;
  });
  for (const c of inbound) {
    try {
      const id = await emitDiscoveredSignal(workspaceId, c.lead_id, "InboundMessageDiscovered", c.payload);
      if (id) emitted++;
    } catch (e) {
      errors.push(`emit InboundMessageDiscovered: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const booking = await detectBookingDrift(workspaceId).catch((e) => {
    errors.push(`booking: ${e instanceof Error ? e.message : String(e)}`);
    return [] as Awaited<ReturnType<typeof detectBookingDrift>>;
  });
  for (const c of booking) {
    try {
      const type = c.type === "BookingCancelled" ? "BookingCancelled" : "BookingModified";
      const id = await emitDiscoveredSignal(workspaceId, c.lead_id, type, c.payload);
      if (id) emitted++;
    } catch (e) {
      errors.push(`emit ${c.type}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const attendance = await detectAttendanceTruth(workspaceId).catch((e) => {
    errors.push(`attendance: ${e instanceof Error ? e.message : String(e)}`);
    return [] as Awaited<ReturnType<typeof detectAttendanceTruth>>;
  });
  for (const c of attendance) {
    try {
      const type = c.type === "AppointmentCompleted" ? "AppointmentCompleted" : "AppointmentMissed";
      const id = await emitDiscoveredSignal(workspaceId, c.lead_id, type, c.payload);
      if (id) emitted++;
    } catch (e) {
      errors.push(`emit ${c.type}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const human = await detectHumanOverride(workspaceId).catch((e) => {
    errors.push(`human: ${e instanceof Error ? e.message : String(e)}`);
    return [] as Awaited<ReturnType<typeof detectHumanOverride>>;
  });
  for (const c of human) {
    try {
      const id = await emitDiscoveredSignal(workspaceId, c.lead_id, "HumanReplyDiscovered", c.payload);
      if (id) emitted++;
    } catch (e) {
      errors.push(`emit HumanReplyDiscovered: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (PAYMENTS_GATED) {
    const payment = await detectPaymentDrift(workspaceId).catch((e) => {
      errors.push(`payment: ${e instanceof Error ? e.message : String(e)}`);
      return [] as Awaited<ReturnType<typeof detectPaymentDrift>>;
    });
    for (const c of payment) {
      try {
        const id = await emitDiscoveredSignal(workspaceId, c.lead_id, c.type, c.payload);
        if (id) emitted++;
      } catch (e) {
        errors.push(`emit ${c.type}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return { emitted, errors };
}

/**
 * Run reconciliation with safety guard: if any lead would receive > MAX_SIGNALS_PER_LEAD_PER_RUN
 * discovered signals in one run, escalate and skip emitting for that lead to prevent storms.
 */
export async function runReconciliationForWorkspaceSafe(workspaceId: string): Promise<{ emitted: number; errors: string[] }> {
  const inbound = await detectInboundGaps(workspaceId).catch(() => [] as Array<{ lead_id: string }>);
  const booking = await detectBookingDrift(workspaceId).catch(() => [] as Array<{ lead_id: string; type: string; payload: unknown }>);
  const attendance = await detectAttendanceTruth(workspaceId).catch(() => [] as Array<{ lead_id: string; type: string; payload: unknown }>);
  const human = await detectHumanOverride(workspaceId).catch(() => [] as Array<{ lead_id: string; payload: unknown }>);
  const payment = PAYMENTS_GATED
    ? await detectPaymentDrift(workspaceId).catch(() => [] as Array<{ lead_id: string; type: string; payload: unknown }>)
    : [];

  const totalByLead = mergeCounts([
    countByLead(inbound),
    countByLead(booking),
    countByLead(attendance),
    countByLead(human),
    countByLead(payment),
  ]);
  const blockedLeadIds = new Set<string>();
  for (const [leadId, count] of totalByLead) {
    if (count > MAX_SIGNALS_PER_LEAD_PER_RUN) {
      blockedLeadIds.add(leadId);
      const { logEscalation } = await import("@/lib/escalation");
      await logEscalation(
        workspaceId,
        leadId,
        "system_integrity_violation",
        "Reconciliation storm guard",
        `Would insert ${count} signals for one lead in a single run (max ${MAX_SIGNALS_PER_LEAD_PER_RUN})`
      );
    }
  }

  const errors: string[] = [];
  let emitted = 0;

  const filterBlocked = <T extends { lead_id: string }>(arr: T[]) =>
    arr.filter((c) => !blockedLeadIds.has(c.lead_id));

  for (const c of filterBlocked(inbound)) {
    try {
      const id = await emitDiscoveredSignal(workspaceId, c.lead_id, "InboundMessageDiscovered", ((c as { payload?: unknown }).payload ?? {}) as Record<string, unknown>);
      if (id) emitted++;
    } catch (e) {
      errors.push(`emit InboundMessageDiscovered: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  for (const c of filterBlocked(booking)) {
    try {
      const type = c.type === "BookingCancelled" ? "BookingCancelled" : "BookingModified";
      const id = await emitDiscoveredSignal(workspaceId, c.lead_id, type, c.payload as Record<string, unknown>);
      if (id) emitted++;
    } catch (e) {
      errors.push(`emit ${c.type}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  for (const c of filterBlocked(attendance)) {
    try {
      const type = c.type === "AppointmentCompleted" ? "AppointmentCompleted" : "AppointmentMissed";
      const id = await emitDiscoveredSignal(workspaceId, c.lead_id, type, c.payload as Record<string, unknown>);
      if (id) emitted++;
    } catch (e) {
      errors.push(`emit ${c.type}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  for (const c of filterBlocked(human)) {
    try {
      const id = await emitDiscoveredSignal(workspaceId, c.lead_id, "HumanReplyDiscovered", ((c as { payload?: unknown }).payload ?? {}) as Record<string, unknown>);
      if (id) emitted++;
    } catch (e) {
      errors.push(`emit HumanReplyDiscovered: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  for (const c of filterBlocked(payment)) {
    try {
      const id = await emitDiscoveredSignal(
        workspaceId,
        c.lead_id,
        c.type as Parameters<typeof emitDiscoveredSignal>[2],
        c.payload as Record<string, unknown>
      );
      if (id) emitted++;
    } catch (e) {
      errors.push(`emit ${c.type}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { emitted, errors };
}

/** List workspace ids to reconcile (batch: 25 workspaces, 200 leads cap across run). */
export async function getWorkspacesForReconciliation(limitWorkspaces: number): Promise<string[]> {
  const db = getDb();
  const { data } = await db
    .from("workspaces")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(limitWorkspaces);
  return (data ?? []).map((r: { id: string }) => r.id);
}
