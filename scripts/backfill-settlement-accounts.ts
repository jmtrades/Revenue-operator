#!/usr/bin/env npx tsx
/**
 * One-time backfill: ensure settlement_accounts for all workspaces with economic_activation.
 * No Stripe calls. Safe to run multiple times.
 */

import { getDb } from "../src/lib/db/queries";
import { ensureSettlementAccount } from "../src/lib/settlement";

async function main() {
  const db = getDb();
  const { data: rows } = await db.from("economic_activation").select("workspace_id");
  const workspaceIds = (rows ?? []).map((r: { workspace_id: string }) => r.workspace_id);
  for (const workspaceId of workspaceIds) {
    await ensureSettlementAccount(workspaceId);
  }
  console.log(JSON.stringify({ ok: true, workspaces_processed: workspaceIds.length }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
