/**
 * Proof capsule: boolean attestations only. No counts, amounts, dates, ids.
 */

import { getDb } from "@/lib/db/queries";

const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D = 7 * 24 * 60 * 60 * 1000;
const MS_30D = 30 * 24 * 60 * 60 * 1000;

export interface ProofCapsule {
  outcomes_confirmed_last_24h: boolean;
  recovery_executed_last_7d: boolean;
  shared_acknowledgement_exists_last_30d: boolean;
  payment_delay_resolved_last_30d: boolean;
}

export async function getProofCapsule(workspaceId: string): Promise<ProofCapsule> {
  const db = getDb();
  const now = Date.now();
  const since24h = new Date(now - MS_24H).toISOString();
  const since7d = new Date(now - MS_7D).toISOString();
  const since30d = new Date(now - MS_30D).toISOString();

  const [orientation, economic7d, narrativeAction, protocolAck, paymentRecovered] = await Promise.all([
    db
      .from("orientation_records")
      .select("id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", since24h)
      .limit(1)
      .maybeSingle(),
    db
      .from("economic_events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", since7d)
      .limit(1)
      .maybeSingle(),
    db
      .from("operational_narrative")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("entry_type", "action_executed")
      .gte("created_at", since7d)
      .limit(1)
      .maybeSingle(),
    db
      .from("protocol_events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("event_type", "acknowledged")
      .gte("created_at", since30d)
      .limit(1)
      .maybeSingle(),
    db
      .from("economic_events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("event_type", "payment_recovered")
      .gte("created_at", since30d)
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    outcomes_confirmed_last_24h: !!orientation?.data,
    recovery_executed_last_7d: !!economic7d?.data || !!narrativeAction?.data,
    shared_acknowledgement_exists_last_30d: !!protocolAck?.data,
    payment_delay_resolved_last_30d: !!paymentRecovered?.data,
  };
}
