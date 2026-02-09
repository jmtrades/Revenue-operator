/**
 * Call preflight: opt-out check. Refuse call if lead opted out.
 * Call engine must consult this before initiating any call.
 */

import { getDb } from "@/lib/db/queries";

export async function shouldRefuseCall(leadId: string): Promise<{ refuse: boolean; reason?: string }> {
  const db = getDb();
  const { data: lead } = await db.from("leads").select("opt_out").eq("id", leadId).single();
  if (!lead) return { refuse: true, reason: "lead_not_found" };
  if ((lead as { opt_out?: boolean }).opt_out) return { refuse: true, reason: "opt_out" };
  return { refuse: false };
}
