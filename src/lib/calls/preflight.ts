/**
 * Call preflight: opt-out check. Refuse call if lead opted out.
 * Call engine must consult this before initiating any call.
 */

import { getDb } from "@/lib/db/queries";
import { fetchSingleRow, type DbSingleQuery } from "@/lib/db/single-row";

export async function shouldRefuseCall(leadId: string): Promise<{ refuse: boolean; reason?: string }> {
  const db = getDb();
  let lead: unknown = null;
  try {
    const q = db.from("leads").select("opt_out").eq("id", leadId) as unknown as DbSingleQuery;
    lead = await fetchSingleRow(q);
  } catch {
    lead = null;
  }
  if (!lead) return { refuse: true, reason: "lead_not_found" };
  if ((lead as { opt_out?: boolean }).opt_out) return { refuse: true, reason: "opt_out" };
  return { refuse: false };
}
