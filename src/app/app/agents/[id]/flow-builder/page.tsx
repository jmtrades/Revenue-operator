export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db/queries";
import { getSessionFromCookie } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import FlowBuilderClient from "./FlowBuilderClient";

export default async function AgentFlowBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: agentId } = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
  const session = getSessionFromCookie(cookieHeader);
  if (!session?.workspaceId) redirect("/app/agents");

  const db = getDb();
  const { data: agent, error } = await db
    .from("agents")
    .select("id, name, workspace_id")
    .eq("id", agentId)
    .maybeSingle();
  if (error || !agent) notFound();

  const workspaceId = (agent as { workspace_id: string }).workspace_id;
  if (session.workspaceId && workspaceId !== session.workspaceId) redirect("/app/agents");

  const agentName = (agent as { name?: string }).name ?? "Agent";
  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6">
      <FlowBuilderClient agentId={agentId} agentName={agentName} />
    </div>
  );
}
