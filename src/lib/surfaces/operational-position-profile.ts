/**
 * Operational position profile: organization | solo | individual | public_observer.
 * Used for message tone selection only — NOT logic. Auto-detected from workspace signals.
 */

import { getDb } from "@/lib/db/queries";

export type OperationalPositionProfile = "organization" | "solo" | "individual" | "public_observer";

export async function getOperationalPositionProfile(workspaceId: string): Promise<OperationalPositionProfile> {
  const db = getDb();

  const [userCount, personalRefCount, staffRelianceRow, hasPublicViews] = await Promise.all([
    db.from("users").select("id", { count: "exact", head: true }).then((r) => (r as { count?: number }).count ?? 0),
    db.from("personal_references").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).then((r) => (r as { count?: number }).count ?? 0),
    db.from("staff_operational_reliance").select("workspace_id").eq("workspace_id", workspaceId).limit(1).maybeSingle(),
    db.from("record_reference_events").select("id").eq("workspace_id", workspaceId).limit(1).maybeSingle(),
  ]);

  if ((hasPublicViews as { data?: unknown })?.data) return "public_observer";
  if ((personalRefCount as number) > 0 && (userCount as number) <= 1) return "individual";
  if ((staffRelianceRow as { data?: unknown })?.data) return "organization";
  return "solo";
}
