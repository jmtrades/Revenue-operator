/**
 * Forwarded access detection: when public work links are opened by different devices/contexts.
 * Records observer events and orientation statements.
 */

import { getDb } from "@/lib/db/queries";
import { hashIpForPublicRecord } from "@/lib/security/rate-limit";
import { recordReciprocalEvent } from "@/lib/reciprocal-events";
import { recordOrientationStatement } from "@/lib/orientation/records";

/**
 * Detect and record forwarded access when a public work link is viewed by a new party.
 * Returns true if this is a new party (different IP hash than original counterparty).
 */
export async function detectAndRecordForwardedAccess(
  externalRef: string,
  ip: string,
  workspaceId: string
): Promise<boolean> {
  const db = getDb();
  const _ipHash = hashIpForPublicRecord(ip);
  
  const { data: tx } = await db
    .from("shared_transactions")
    .select("id, counterparty_identifier")
    .eq("external_ref", externalRef)
    .maybeSingle();
  
  if (!tx) return false;
  const threadId = (tx as { id: string }).id;
  const _counterpartyIdentifier = (tx as { counterparty_identifier: string }).counterparty_identifier;
  
  const { data: firstView } = await db
    .from("record_reference_events")
    .select("actor_type, recorded_at")
    .eq("workspace_id", workspaceId)
    .eq("external_ref", externalRef)
    .eq("reference_type", "public_record")
    .order("recorded_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  
  if (!firstView) {
    return false;
  }
  
  const { data: currentView } = await db
    .from("record_reference_events")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("external_ref", externalRef)
    .eq("reference_type", "public_record")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!currentView) return false;
  
  const { data: observerEvents } = await db
    .from("reciprocal_events")
    .select("id")
    .eq("thread_id", threadId)
    .eq("actor_role", "observer")
    .eq("operational_action", "record_viewed_by_new_party")
    .limit(1)
    .maybeSingle();
  
  if (observerEvents) {
    return false;
  }
  
  const { data: allViews } = await db
    .from("record_reference_events")
    .select("actor_type")
    .eq("workspace_id", workspaceId)
    .eq("external_ref", externalRef)
    .eq("reference_type", "public_record");
  
  const uniqueActors = new Set((allViews ?? []).map((v: { actor_type: string }) => v.actor_type));
  
  if (uniqueActors.size > 1 || (firstView.actor_type !== "counterparty" && firstView.actor_type !== "originator")) {
    const eventId = await recordReciprocalEvent({
      threadId,
      actorRole: "observer",
      operationalAction: "record_viewed_by_new_party",
    });
    
    if (eventId) {
      await recordOrientationStatement(workspaceId, "An additional party viewed this record.").catch(() => {});
      return true;
    }
  }
  
  return false;
}
