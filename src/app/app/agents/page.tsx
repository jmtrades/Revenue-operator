export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { getDb } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import AgentsPageClient from "./AgentsPageClient";

type InitialFallbackAgent = {
  businessName?: string;
  greeting?: string;
  agentName?: string;
  voiceId?: string;
  knowledgeItems?: Array<{ q?: string; a?: string }>;
} | null;

async function getInitialUserContext(): Promise<{
  userId: string | null;
  workspaceId: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      return { userId: user.id, workspaceId: null };
    }
  } catch {
    // fall through to revenue_session cookie
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  const session = getSessionFromCookie(cookieHeader);
  return {
    userId: session?.userId ?? null,
    workspaceId: session?.workspaceId ?? null,
  };
}

async function getInitialAgentsPayload(): Promise<{
  workspaceId: string;
  workspaceName: string;
  initialAgentsRows: Array<Record<string, unknown>>;
  initialFallbackAgent: InitialFallbackAgent;
}> {
  try {
    const { userId, workspaceId: sessionWorkspaceId } = await getInitialUserContext();
    if (!userId) {
      return { workspaceId: "", workspaceName: "", initialAgentsRows: [], initialFallbackAgent: null };
    }

    const db = getDb();
    const { data: ownedWorkspaces } = await db
      .from("workspaces")
      .select("id, name, created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    const workspaceList = Array.isArray(ownedWorkspaces)
      ? (ownedWorkspaces as Array<{ id: string; name?: string | null }>)
      : [];
    const resolvedWorkspaceId =
      (sessionWorkspaceId &&
        workspaceList.find((workspace) => workspace.id === sessionWorkspaceId)?.id) ||
      workspaceList[0]?.id ||
      "";
    const workspaceName = workspaceList.find((w) => w.id === resolvedWorkspaceId)?.name?.trim() ?? "";

    if (!resolvedWorkspaceId) {
      return { workspaceId: "", workspaceName: "", initialAgentsRows: [], initialFallbackAgent: null };
    }

    const { data: agents } = await db
      .from("agents")
      .select("*")
      .eq("workspace_id", resolvedWorkspaceId)
      .order("created_at", { ascending: false });

    const initialAgentsRows = Array.isArray(agents)
      ? (agents as Array<Record<string, unknown>>)
      : [];

    if (initialAgentsRows.length > 0) {
      const wsName = workspaceList.find((w) => w.id === resolvedWorkspaceId)?.name?.trim() ?? "";
      return {
        workspaceId: resolvedWorkspaceId,
        workspaceName: wsName,
        initialAgentsRows,
        initialFallbackAgent: null,
      };
    }

    const { data: workspaceAgent } = await db
      .from("workspaces")
      .select("name, greeting, agent_name, voice_id, knowledge_items")
      .eq("id", resolvedWorkspaceId)
      .maybeSingle();

    const fallbackRow = (workspaceAgent ?? null) as
      | {
          name?: string | null;
          greeting?: string | null;
          agent_name?: string | null;
          voice_id?: string | null;
          knowledge_items?: Array<{ q?: string; a?: string }> | null;
        }
      | null;

    return {
      workspaceId: resolvedWorkspaceId,
      workspaceName,
      initialAgentsRows: [],
      initialFallbackAgent: fallbackRow
        ? {
            businessName: fallbackRow.name ?? "",
            greeting: fallbackRow.greeting ?? "",
            agentName: fallbackRow.agent_name ?? "",
            voiceId: fallbackRow.voice_id ?? "",
            knowledgeItems: Array.isArray(fallbackRow.knowledge_items)
              ? fallbackRow.knowledge_items
              : [],
          }
        : null,
    };
  } catch (error) {
    console.error("[getInitialAgentsPayload] Error:", error instanceof Error ? error.message : String(error));
    return { workspaceId: "", workspaceName: "", initialAgentsRows: [], initialFallbackAgent: null };
  }
}

export default async function AppAgentsPage() {
  const initial = await getInitialAgentsPayload();
  return (
    <AgentsPageClient
      initialWorkspaceId={initial.workspaceId}
      initialWorkspaceName={initial.workspaceName}
      initialAgentsRows={initial.initialAgentsRows}
      initialFallbackAgent={initial.initialFallbackAgent}
    />
  );
}
