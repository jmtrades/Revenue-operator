/**
 * Dependency resolver: attach missing outcome_dependencies using thread_reference_memory and subject matches.
 * Bounded, cron-safe, deterministic only.
 */

import { getDb } from "@/lib/db/queries";
import { recordOutcomeDependency } from "@/lib/outcome-dependencies";

const MAX_RESOLVE_PER_RUN = 50;

/**
 * Resolve missing dependencies for a workspace (bounded, safe for cron).
 */
export async function resolveMissingDependencies(workspaceId: string): Promise<number> {
  const db = getDb();
  let resolved = 0;
  
  const { data: threads } = await db
    .from("shared_transactions")
    .select("id, subject_type, subject_id, lead_id, conversation_id")
    .eq("workspace_id", workspaceId)
    .limit(MAX_RESOLVE_PER_RUN);
  
  if (!threads || threads.length === 0) return 0;
  
  const threadIds = (threads as { id: string; subject_type: string; subject_id: string; lead_id: string | null; conversation_id: string | null }[]).map((t) => t.id);
  
  const { data: refs } = await db
    .from("thread_reference_memory")
    .select("thread_id, reference_context_type, reference_context_id")
    .in("thread_id", threadIds)
    .limit(MAX_RESOLVE_PER_RUN * 2);
  
  if (!refs || refs.length === 0) return 0;
  
  for (const ref of refs) {
    if (resolved >= MAX_RESOLVE_PER_RUN) break;
    
    const threadId = (ref as { thread_id: string }).thread_id;
    const refContextType = (ref as { reference_context_type: string }).reference_context_type;
    const refContextId = (ref as { reference_context_id: string }).reference_context_id;
    
    const { data: existingDep } = await db
      .from("outcome_dependencies")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("source_thread_id", threadId)
      .eq("dependent_context_type", refContextType)
      .eq("dependent_context_id", refContextId)
      .limit(1)
      .maybeSingle();
    
    if (existingDep) continue;
    
    try {
      await recordOutcomeDependency({
        workspaceId,
        sourceThreadId: threadId,
        dependentContextType: refContextType as "shared_transaction" | "commitment" | "payment_obligation" | "conversation" | "lead",
        dependentContextId: refContextId,
        dependencyType: "external_reporting",
      });
      resolved++;
    } catch {
      // Already exists or invalid; skip
    }
  }
  
  for (const thread of threads) {
    if (resolved >= MAX_RESOLVE_PER_RUN) break;
    
    const threadId = thread.id;
    const _subjectType = thread.subject_type;
    const _subjectId = thread.subject_id;
    const leadId = thread.lead_id;
    const conversationId = thread.conversation_id;
    
    if (leadId) {
      const { data: existingDep } = await db
        .from("outcome_dependencies")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("source_thread_id", threadId)
        .eq("dependent_context_type", "lead")
        .eq("dependent_context_id", leadId)
        .limit(1)
        .maybeSingle();
      
      if (!existingDep) {
        try {
          await recordOutcomeDependency({
            workspaceId,
            sourceThreadId: threadId,
            dependentContextType: "lead",
            dependentContextId: leadId,
            dependencyType: "external_reporting",
          });
          resolved++;
        } catch {
          // Skip
        }
      }
    }
    
    if (conversationId) {
      const { data: existingDep } = await db
        .from("outcome_dependencies")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("source_thread_id", threadId)
        .eq("dependent_context_type", "conversation")
        .eq("dependent_context_id", conversationId)
        .limit(1)
        .maybeSingle();
      
      if (!existingDep) {
        try {
          await recordOutcomeDependency({
            workspaceId,
            sourceThreadId: threadId,
            dependentContextType: "conversation",
            dependentContextId: conversationId,
            dependencyType: "external_reporting",
          });
          resolved++;
        } catch {
          // Skip
        }
      }
    }
  }
  
  return resolved;
}
