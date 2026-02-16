/**
 * Cron: Protocol density — invite counterparties with dependent/critical reliance who have no unresolved authority.
 * Run every 15 minutes. Authorization: Bearer CRON_SECRET.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import "@/lib/runtime";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { issueProtocolParticipation } from "@/lib/shared-transaction-assurance";
import { runSafeCron } from "@/lib/cron/run-safe";

export async function GET(request: NextRequest) {
  const authErr = assertCronAuthorized(request);
  if (authErr) return authErr;

  const result = await runSafeCron("protocol-density", async () => {
    const db = getDb();
    const { data: candidates } = await db
      .from("counterparty_reliance")
      .select("workspace_id, counterparty_identifier")
      .in("reliance_state", ["dependent", "critical"])
      .is("invite_issued_at", null);
    if (!candidates?.length) return { run: 1, processed: 0, invited: 0 };

    let invited = 0;
    for (const row of candidates as { workspace_id: string; counterparty_identifier: string }[]) {
      const { workspace_id, counterparty_identifier } = row;
      const { data: hasTx } = await db
        .from("shared_transactions")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("counterparty_identifier", counterparty_identifier)
        .limit(1)
        .maybeSingle();
      if (!hasTx) continue;

      const { data: authorityRow } = await db
        .from("shared_transactions")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("counterparty_identifier", counterparty_identifier)
        .eq("authority_required", true)
        .in("state", ["disputed", "expired"])
        .limit(1)
        .maybeSingle();
      if (authorityRow) continue;

      const { sent } = await issueProtocolParticipation(workspace_id, counterparty_identifier);
      if (sent) invited++;
    }
    return { run: 1, processed: candidates.length, invited };
  });

  return NextResponse.json({
    ok: result.ok,
    jobs_run: result.jobs_run,
    failures: result.failures,
    ...(result.error && { error: result.error }),
    ...(result.details && { details: result.details }),
  });
}
