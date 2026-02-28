/**
 * Require session and workspace ownership or role for workspace-scoped APIs.
 * When session is disabled (dev), allows access. When enabled, returns 401/404 or null (proceed).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "./request-session";
import { isSessionEnabled } from "./session";
import { getDb } from "@/lib/db/queries";

export type WorkspaceRole = "owner" | "admin" | "operator" | "closer" | "auditor" | "compliance";

/**
 * If session is enabled: requires valid session and that the workspace exists and is owned by the session user
 * or the user has a role in workspace_roles. Returns NextResponse (401/404) or null to proceed.
 */
export async function requireWorkspaceAccess(
  req: NextRequest,
  workspaceId: string
): Promise<NextResponse | null> {
  if (!isSessionEnabled()) return null;
  const session = getSession(req);
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const { data: ws } = await db
    .from("workspaces")
    .select("id, owner_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ownerId = (ws as { owner_id: string }).owner_id;
  if (ownerId === session.userId) return null;
  const { data: roleRow } = await db
    .from("workspace_roles")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (roleRow) return null;
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/**
 * Requires workspace access and that the user has one of allowedRoles (or is owner).
 * Owner is always allowed. Returns NextResponse (401/404) or null to proceed.
 */
export async function requireWorkspaceRole(
  req: NextRequest,
  workspaceId: string,
  allowedRoles: WorkspaceRole[]
): Promise<NextResponse | null> {
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;
  if (!isSessionEnabled()) return null;
  const session = getSession(req);
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
  if (ws && (ws as { owner_id: string }).owner_id === session.userId) return null;
  const { data: roleRow } = await db
    .from("workspace_roles")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", session.userId)
    .maybeSingle();
  const role = (roleRow as { role: string } | null)?.role;
  if (role && allowedRoles.includes(role as WorkspaceRole)) return null;
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
