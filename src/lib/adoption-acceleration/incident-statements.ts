/**
 * Re-exports from canonical incidents lib for backward compatibility.
 */

export {
  createIncidentStatement,
  getIncidentMessage,
  getRecentIncidentStatements,
} from "@/lib/incidents";
export type { IncidentCategory } from "@/lib/incidents";

export async function getRecentIncidents(
  workspaceId: string,
  limit: number = 5
): Promise<{ id: string; category: string; message: string; created_at: string; related_external_ref: string | null }[]> {
  const { getRecentIncidentStatements } = await import("@/lib/incidents");
  const rows = await getRecentIncidentStatements(workspaceId, limit);
  return rows.map((r, i) => ({
    id: `legacy-${i}`,
    category: r.category,
    message: r.message,
    created_at: r.created_at,
    related_external_ref: r.related_external_ref,
  }));
}
