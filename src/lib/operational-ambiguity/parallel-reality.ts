/**
 * Parallel reality detection: activity about same subject within 24h without referencing existing thread.
 */

import { getDb } from "@/lib/db/queries";
import { recordOrientationStatement } from "@/lib/orientation/records";
import { log } from "@/lib/logger";

const logParallelRealitySideEffect = (ctx: string) => (e: unknown) => {
  log("warn", `parallel-reality.${ctx}`, {
    error: e instanceof Error ? e.message : String(e),
  });
};

/**
 * Detect and record parallel reality when activity occurs about same subject within 24h without thread reference.
 * Returns true if statement was recorded (once per thread per 24h window).
 */
export async function detectAndRecordParallelReality(
  workspaceId: string,
  subjectType: string,
  subjectId: string,
  activityCreatedAt: Date
): Promise<boolean> {
  const db = getDb();
  
  const dayAgo = new Date(activityCreatedAt.getTime() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: threads } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .gte("created_at", dayAgo)
    .limit(10);
  
  if (!threads || threads.length === 0) return false;
  
  for (const t of threads) {
    const threadId = (t as { id: string }).id;
    
    const { data: recentStatement } = await db
      .from("orientation_records")
      .select("created_at")
      .eq("workspace_id", workspaceId)
      .eq("text", "Related activity occurred without reference to this record.")
      .gte("created_at", dayAgo)
      .limit(1)
      .maybeSingle();
    
    if (recentStatement) continue;
    
    const { data: commitments } = await db
      .from("commitments")
      .select("id, created_at")
      .eq("workspace_id", workspaceId)
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId)
      .gte("created_at", dayAgo)
      .limit(10);
    
    if (commitments?.length) {
      for (const c of commitments) {
        const commitmentId = (c as { id: string }).id;
        const { data: ref } = await db
          .from("thread_reference_memory")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("reference_context_type", "commitment")
          .eq("reference_context_id", commitmentId)
          .limit(1)
          .maybeSingle();
        if (!ref) {
          await recordOrientationStatement(workspaceId, "Related activity occurred without reference to this record.").catch(logParallelRealitySideEffect("record-statement"));
          return true;
        }
      }
    }
    
    const { data: payments } = await db
      .from("payment_obligations")
      .select("id, created_at")
      .eq("workspace_id", workspaceId)
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId)
      .gte("created_at", dayAgo)
      .limit(10);
    
    if (payments?.length) {
      for (const p of payments) {
        const paymentId = (p as { id: string }).id;
        const { data: ref } = await db
          .from("thread_reference_memory")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("reference_context_type", "payment_obligation")
          .eq("reference_context_id", paymentId)
          .limit(1)
          .maybeSingle();
        if (!ref) {
          await recordOrientationStatement(workspaceId, "Related activity occurred without reference to this record.").catch(logParallelRealitySideEffect("record-statement"));
          return true;
        }
      }
    }
    
    const { data: conversations } = await db
      .from("conversations")
      .select("id, created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", dayAgo)
      .limit(10);
    
    if (conversations?.length) {
      for (const conv of conversations) {
        const convId = (conv as { id: string }).id;
        const { data: ref } = await db
          .from("thread_reference_memory")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("reference_context_type", "conversation")
          .eq("reference_context_id", convId)
          .limit(1)
          .maybeSingle();
        if (!ref) {
          const { data: convRow } = await db
            .from("conversations")
            .select("lead_id")
            .eq("id", convId)
            .maybeSingle();
          if (convRow) {
            const leadId = (convRow as { lead_id: string }).lead_id;
            const { data: threadWithLead } = await db
              .from("shared_transactions")
              .select("id")
              .eq("workspace_id", workspaceId)
              .eq("lead_id", leadId)
              .eq("id", threadId)
              .maybeSingle();
            if (threadWithLead) {
              await recordOrientationStatement(workspaceId, "Related activity occurred without reference to this record.").catch(logParallelRealitySideEffect("record-statement"));
              return true;
            }
          }
        }
      }
    }
    
    const { data: newTxs } = await db
      .from("shared_transactions")
      .select("id, created_at")
      .eq("workspace_id", workspaceId)
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId)
      .neq("id", threadId)
      .gte("created_at", dayAgo)
      .limit(10);
    
    if (newTxs?.length) {
      for (const tx of newTxs) {
        const txId = (tx as { id: string }).id;
        const { data: ref } = await db
          .from("thread_reference_memory")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("reference_context_type", "shared_transaction")
          .eq("reference_context_id", txId)
          .limit(1)
          .maybeSingle();
        if (!ref) {
          await recordOrientationStatement(workspaceId, "Related activity occurred without reference to this record.").catch(logParallelRealitySideEffect("record-statement"));
          return true;
        }
      }
    }
  }
  
  return false;
}
