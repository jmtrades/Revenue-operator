import { getDb } from "@/lib/db/queries";

export interface ExternalExecutionIssue {
  has_issue: boolean;
}

export async function detectExternalExecutionIssue(workspaceId: string | null | undefined): Promise<ExternalExecutionIssue> {
  if (!workspaceId) return { has_issue: false };

  try {
    const db = getDb();
    const since = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const { data } = await db
      .from("action_intents")
      .select("id, claimed_at, completed_at")
      .eq("workspace_id", workspaceId)
      .not("claimed_at", "is", null)
      .is("completed_at", null)
      .lt("claimed_at", since)
      .order("claimed_at", { ascending: true })
      .limit(1);

    return { has_issue: Array.isArray(data) && data.length > 0 };
  } catch {
    return { has_issue: false };
  }
}

