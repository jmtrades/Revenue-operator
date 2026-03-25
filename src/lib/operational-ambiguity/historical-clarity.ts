/**
 * Historical clarity: thread prevents later dispute (acknowledged → later matching activity).
 */

import { getDb } from "@/lib/db/queries";

/**
 * True when a thread prevented later dispute (acknowledged → later matching activity without dispute).
 */
export async function hasHistoricalClarity(
  workspaceId: string,
  periodStart: string,
  periodEnd: string
): Promise<boolean> {
  const db = getDb();
  
  const { data: acknowledgedThreads } = await db
    .from("shared_transactions")
    .select("id, subject_type, subject_id, acknowledged_at")
    .eq("workspace_id", workspaceId)
    .eq("state", "acknowledged")
    .gte("acknowledged_at", periodStart)
    .lte("acknowledged_at", periodEnd);
  
  if (!acknowledgedThreads || acknowledgedThreads.length === 0) return false;
  
  for (const thread of acknowledgedThreads) {
    const threadId = (thread as { id: string }).id;
    const subjectType = (thread as { subject_type: string }).subject_type;
    const subjectId = (thread as { subject_id: string }).subject_id;
    const acknowledgedAt = (thread as { acknowledged_at: string }).acknowledged_at;
    
    const ackTime = new Date(acknowledgedAt).getTime();
    const afterAck = new Date(ackTime + 1000).toISOString();
    
    const { data: laterActivity } = await db
      .from("shared_transactions")
      .select("id, state")
      .eq("workspace_id", workspaceId)
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId)
      .gte("created_at", afterAck)
      .lte("created_at", periodEnd)
      .neq("id", threadId)
      .limit(10);
    
    if (laterActivity && laterActivity.length > 0) {
      const hasDispute = (laterActivity as { state: string }[]).some((a) => a.state === "disputed");
      if (!hasDispute) {
        return true;
      }
    }
  }
  
  return false;
}
