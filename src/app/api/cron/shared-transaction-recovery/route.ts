/**
 * Cron: Shared Transaction Recovery. Runs every 10 minutes.
 * Overdue pending_acknowledgement: send reminder + extend deadline once, then escalate (expired + authority_required).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { runSafeCron } from "@/lib/cron/run-safe";
import {
  getOverduePendingAcknowledgements,
  runRecoveryForSharedTransaction,
} from "@/lib/shared-transaction-assurance";

const MAX_PER_RUN = 20;

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("shared-transaction-recovery", async () => {
    const { getWorkspaceIdsWithAutomationAllowed } = await import("@/lib/adoption-acceleration/installation-state");
    const allowedWorkspaces = await getWorkspaceIdsWithAutomationAllowed();
    const list = await getOverduePendingAcknowledgements(MAX_PER_RUN);
    const filtered = list.filter((tx) => allowedWorkspaces.has(tx.workspace_id));
    for (const tx of list) {
      if (!allowedWorkspaces.has(tx.workspace_id)) {
        const { recordObservedRisk } = await import("@/lib/adoption-acceleration/observed-risks");
        await recordObservedRisk(tx.workspace_id, "missed_confirmation", "shared_transaction", tx.id).catch((err) => { console.error("[cron/shared-transaction-recovery] error:", err instanceof Error ? err.message : err); });
      }
    }
    let reminders = 0;
    let escalated = 0;
    for (const tx of filtered) {
      const { ok, escalated: esc } = await runRecoveryForSharedTransaction(tx);
      if (ok && esc) escalated++;
      else if (ok) reminders++;
    }
    return {
      run: 1,
      reminders,
      escalated,
      processed: filtered.length,
    };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
