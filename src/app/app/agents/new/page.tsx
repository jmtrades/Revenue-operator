export const dynamic = "force-dynamic";

import { getSessionFromCookie } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/queries";
import NewAgentWizardClient from "./NewAgentWizardClient";

async function getWorkspaceContext(): Promise<{ workspaceId: string; workspaceName: string } | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
  const session = getSessionFromCookie(cookieHeader);
  const userId = session?.userId ?? null;
  const workspaceId = session?.workspaceId ?? null;
  if (!userId) return null;

  const db = getDb();
  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, name")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  const ws = Array.isArray(workspaces) && workspaces.length > 0 ? workspaces[0] : null;
  if (!ws) return null;
  const wid = (ws as { id: string }).id;
  const resolvedId = workspaceId && wid === workspaceId ? workspaceId : wid;
  const name = (ws as { name?: string | null }).name?.trim() ?? "";
  return { workspaceId: resolvedId, workspaceName: name };
}

export default async function NewAgentPage() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/app/agents");
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <NewAgentWizardClient
        workspaceId={context.workspaceId}
        workspaceName={context.workspaceName}
      />
    </div>
  );
}
