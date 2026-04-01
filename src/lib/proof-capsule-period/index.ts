/**
 * Proof capsule: ladder order — 1 causality, 2 continuation, 3 displacement. Max 8 lines. No economic or relief lines.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";

const MAX_LINE_LEN = 90;
const MAX_LINES = 8;

const CAUSALITY_LINE: Record<string, string> = {
  commitment_recovery: "Confirmation occurred after follow-up.",
  opportunity_revival: "Conversation resumed after outreach.",
  payment_recovery: "Payment completed after reminder.",
  shared_transaction_ack: "Agreement acknowledged after request.",
};

const CONTINUATION_LINE: Record<string, string> = {
  waiting: "A delay did not continue.",
  uncertain_attendance: "Attendance uncertainty did not persist.",
  unpaid: "The payment did not remain outstanding.",
  unaligned: "The agreement did not remain unconfirmed.",
};

const DISPLACEMENT_LINE_AFTER: Record<string, string> = {
  attendance: "Participants acted without reconfirmation.",
  payment: "Payment followed recorded terms.",
  responsibility: "Responsibility was clarified through the record.",
  confirmation: "Work proceeded without manual clarification.",
  continuation: "Work proceeded without manual clarification.",
};
const DISPLACEMENT_LINE_WITHOUT: Record<string, string> = {
  attendance: "A schedule was confirmed without follow-up.",
  payment: "Payment completed without manual chasing.",
  responsibility: "Responsibility was clarified through the record.",
  confirmation: "A shared record was confirmed without prompting.",
  continuation: "A conversation continued without re-engagement.",
};

const RESPONSIBILITY_LINE: Record<string, string> = {
  environment: "Outcomes occurred under the operating process.",
  shared: "Decisions executed through the shared record.",
};
const RESPONSIBILITY_NO_BUSINESS = "The provider did not manually determine the outcome.";

function trim(s: string): string {
  return s.length > MAX_LINE_LEN ? s.slice(0, MAX_LINE_LEN).trim() : s;
}

export async function buildProofCapsuleForPeriod(
  workspaceId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<string[]> {
  const db = getDb();
  const startIso = periodStart.toISOString();
  const endIso = periodEnd.toISOString();

  const [chainRes, exposureRes, displacementRes, responsibilityRes] = await Promise.all([
    db
      .from("causal_chains")
      .select("intervention_type")
      .eq("workspace_id", workspaceId)
      .eq("dependency_established", true)
      .gte("determined_at", startIso)
      .lte("determined_at", endIso),
    db
      .from("continuation_exposures")
      .select("unresolved_state")
      .eq("workspace_id", workspaceId)
      .eq("intervention_stopped_it", true)
      .gte("recorded_at", startIso)
      .lte("recorded_at", endIso),
    db
      .from("coordination_displacement_events")
      .select("decision_type, after_intervention")
      .eq("workspace_id", workspaceId)
      .eq("relied_on_environment", true)
      .gte("recorded_at", startIso)
      .lte("recorded_at", endIso),
    db
      .from("responsibility_moments")
      .select("authority_holder")
      .eq("workspace_id", workspaceId)
      .gte("recorded_at", startIso)
      .lte("recorded_at", endIso),
  ]);

  const chainRows = chainRes?.data ?? [];
  const exposureRows = exposureRes?.data ?? [];
  const displacementRows = displacementRes?.data ?? [];
  const responsibilityRows = responsibilityRes?.data ?? [];
  const lines: string[] = [];

  const interventionTypes = new Set(chainRows.map((r: { intervention_type: string }) => r.intervention_type));
  if (interventionTypes.size > 0) {
    lines.push(trim("Outcomes followed intervention."));
    for (const it of ["commitment_recovery", "opportunity_revival", "payment_recovery", "shared_transaction_ack"]) {
      if (interventionTypes.has(it)) {
        const line = CAUSALITY_LINE[it];
        if (line) lines.push(trim(line));
      }
    }
  }

  const continuationStates = new Set(exposureRows.map((r: { unresolved_state: string }) => r.unresolved_state));
  for (const state of ["waiting", "uncertain_attendance", "unpaid", "unaligned"]) {
    if (continuationStates.has(state)) {
      const line = CONTINUATION_LINE[state];
      if (line) lines.push(trim(line));
    }
  }

  const displacementSeen = new Set<string>();
  for (const r of displacementRows) {
    const row = r as { decision_type: string; after_intervention?: boolean };
    const after = row.after_intervention !== false;
    const line = after ? DISPLACEMENT_LINE_AFTER[row.decision_type] : DISPLACEMENT_LINE_WITHOUT[row.decision_type];
    if (line) displacementSeen.add(trim(line));
  }
  const displacementOrder = [
    DISPLACEMENT_LINE_AFTER.attendance,
    DISPLACEMENT_LINE_WITHOUT.attendance,
    DISPLACEMENT_LINE_AFTER.payment,
    DISPLACEMENT_LINE_WITHOUT.payment,
    DISPLACEMENT_LINE_AFTER.responsibility,
    DISPLACEMENT_LINE_WITHOUT.confirmation,
    DISPLACEMENT_LINE_AFTER.confirmation,
    DISPLACEMENT_LINE_AFTER.continuation,
    DISPLACEMENT_LINE_WITHOUT.continuation,
  ];
  for (const line of displacementOrder) {
    const t = trim(line);
    if (displacementSeen.has(t) && !lines.includes(t)) lines.push(t);
  }

  const responsibilityHolders = new Set(responsibilityRows.map((r: { authority_holder: string }) => r.authority_holder));
  for (const h of ["environment", "shared"]) {
    if (responsibilityHolders.has(h)) {
      const line = RESPONSIBILITY_LINE[h];
      if (line && !lines.includes(trim(line))) lines.push(trim(line));
    }
  }
  if (!responsibilityHolders.has("business") && responsibilityHolders.size > 0) {
    const line = trim(RESPONSIBILITY_NO_BUSINESS);
    if (!lines.includes(line)) lines.push(line);
  }

  if (lines.length < MAX_LINES) {
    const { data: protectionRows } = await db
      .from("operational_exposures")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("interrupted_by_process", true)
      .gte("exposure_resolved_at", startIso)
      .lte("exposure_resolved_at", endIso)
      .limit(1);
    if ((protectionRows?.length ?? 0) > 0) {
      const { PROOF_CAPSULE_PROTECTION_LINE } = await import("@/lib/exposure-engine");
      const protectionLine = trim(PROOF_CAPSULE_PROTECTION_LINE);
      if (!lines.includes(protectionLine)) lines.push(protectionLine);
    }
  }

  const { providerDetachmentEstablished } = await import("@/lib/detachment");
  if (await providerDetachmentEstablished(workspaceId)) {
    const DETACHMENT_LINES = [
      "Outcomes no longer required provider action.",
      "The process operated without supervision.",
      "Operations continued during absence.",
    ];
    for (const line of DETACHMENT_LINES) {
      const t = trim(line);
      if (!lines.includes(t)) lines.push(t);
      if (lines.length >= MAX_LINES) break;
    }
  }

  const { processMaintainsOperation } = await import("@/lib/operability-anchor");
  if (await processMaintainsOperation(workspaceId)) {
    const anchoredLine = trim("The operation depended on the process remaining active.");
    if (!lines.includes(anchoredLine)) lines.push(anchoredLine);
  }

  const { assumptionEstablished, PROOF_CAPSULE_ASSUMPTION_LINE } = await import("@/lib/assumption-engine");
  if (lines.length < MAX_LINES && (await assumptionEstablished(workspaceId))) {
    const assumptionLine = trim(PROOF_CAPSULE_ASSUMPTION_LINE);
    if (!lines.includes(assumptionLine)) lines.push(assumptionLine);
  }

  const { normalizationEstablished, PROOF_CAPSULE_NORMALIZATION_LINE } = await import("@/lib/normalization-engine");
  if (lines.length < MAX_LINES && (await normalizationEstablished(workspaceId))) {
    const normalizationLine = trim(PROOF_CAPSULE_NORMALIZATION_LINE);
    if (!lines.includes(normalizationLine)) lines.push(normalizationLine);
  }

  if (lines.length < MAX_LINES) {
    const { data: threads } = await db.from("shared_transactions").select("id").eq("workspace_id", workspaceId);
    const threadIds = (threads ?? []).map((t: { id: string }) => t.id);
    if (threadIds.length > 0) {
      const { data: amendment } = await db
        .from("thread_amendments")
        .select("id")
        .in("thread_id", threadIds)
        .gte("recorded_at", startIso)
        .lte("recorded_at", endIso)
        .limit(1)
        .maybeSingle();
      if (amendment) {
        const { STATEMENT_EARLIER_ACTIVITY_AMENDED } = await import("@/lib/institutional-auditability");
        const amendmentLine = trim(STATEMENT_EARLIER_ACTIVITY_AMENDED);
        if (!lines.includes(amendmentLine)) lines.push(amendmentLine);
      }
    }
  }

  if (lines.length < MAX_LINES) {
    const { workspaceHadStabilityInPeriod, STATEMENT_PROOF_STABILITY } = await import("@/lib/temporal-stability");
    if (await workspaceHadStabilityInPeriod(workspaceId, startIso, endIso)) {
      const stabilityLine = trim(STATEMENT_PROOF_STABILITY);
      if (!lines.includes(stabilityLine)) lines.push(stabilityLine);
    }
  }

  if (lines.length < MAX_LINES) {
    const { hasProofCascade } = await import("@/lib/third-party-reliance/proof-cascade");
    if (await hasProofCascade(workspaceId)) {
      const cascadeLine = trim("Independent work relied on prior recorded outcomes.");
      if (!lines.includes(cascadeLine)) lines.push(cascadeLine);
    }
  }

  if (lines.length < MAX_LINES) {
    const { hasHistoricalClarity } = await import("@/lib/operational-ambiguity/historical-clarity");
    if (await hasHistoricalClarity(workspaceId, startIso, endIso)) {
      const clarityLine = trim("Recorded confirmation prevented later disagreement.");
      if (!lines.includes(clarityLine)) lines.push(clarityLine);
    }
  }

  if (lines.length < MAX_LINES) {
    const { data: threads } = await db.from("shared_transactions").select("id").eq("workspace_id", workspaceId);
    const threadIds = (threads ?? []).map((t: { id: string }) => t.id);
    if (threadIds.length > 0) {
      const { data: evidenceAfterReliance } = await db
        .from("thread_amendments")
        .select("id")
        .in("thread_id", threadIds)
        .eq("amendment_type", "evidence_change")
        .gte("recorded_at", startIso)
        .lte("recorded_at", endIso)
        .limit(1)
        .maybeSingle();
      if (evidenceAfterReliance) {
        const evidenceLine = trim("Outcome evidence was added after reliance.");
        if (!lines.includes(evidenceLine)) lines.push(evidenceLine);
      }
    }
  }

  return lines.slice(0, MAX_LINES);
}

export async function saveProofCapsule(
  workspaceId: string,
  periodStart: Date,
  periodEnd: Date,
  lines: string[]
): Promise<void> {
  const db = getDb();
  const periodStartDate = periodStart.toISOString().slice(0, 10);
  const periodEndDate = periodEnd.toISOString().slice(0, 10);
  await db
    .from("proof_capsules")
    .upsert(
      {
        workspace_id: workspaceId,
        period_start: periodStartDate,
        period_end: periodEndDate,
        lines,
        created_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,period_end" }
    );
  
  const { checkAndConfirmInstallation } = await import("@/lib/installation/confirm");
  await checkAndConfirmInstallation(workspaceId).catch((e: unknown) => {
    log("error", "checkAndConfirmInstallation failed", { error: e instanceof Error ? e.message : String(e) });
  });
}
