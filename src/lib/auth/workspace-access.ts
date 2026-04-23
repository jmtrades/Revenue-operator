/**
 * Require session and workspace ownership or role for workspace-scoped APIs.
 * When session is disabled (dev), allows access. When enabled, returns 401/404 or null (proceed).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "./request-session";
import { isSessionEnabled } from "./session";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export type WorkspaceRole = "owner" | "admin" | "operator" | "closer" | "auditor" | "compliance";

/**
 * RBAC role stored on `workspace_members` (distinct from the legacy
 * `workspace_roles` table). Phase 1 inserts `owner` here on workspace
 * creation; future invitations will add `admin`, `manager`, `viewer`.
 */
export type MemberRole = "owner" | "admin" | "manager" | "viewer";

const MEMBER_ROLE_RANK: Record<MemberRole, number> = {
  viewer: 0,
  manager: 1,
  admin: 2,
  owner: 3,
};

/**
 * Require session + workspace membership via the `workspace_members` table.
 *
 * This is the Phase 1+ preferred helper — it checks the membership model
 * we actually write to during activation. `requireWorkspaceAccess` below
 * checks the legacy `workspace_roles` table and is kept for backward compat.
 *
 * When `minRole` is provided, returns 403 if the member has a lower role.
 */
export async function requireWorkspaceMember(
  req: NextRequest,
  workspaceId: string,
  minRole?: MemberRole,
): Promise<NextResponse | null> {
  if (!isSessionEnabled()) {
    if (process.env.NODE_ENV === "production") {
      log(
        "error",
        "[SECURITY] requireWorkspaceMember called with sessions disabled in production",
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null; // Dev-only bypass
  }

  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Owner on the workspace row is always allowed (handles the case where
  // the workspace_members row was never created — a gap we close over time).
  const { data: ws } = await db
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if ((ws as { owner_id?: string } | null)?.owner_id === session.userId) {
    return null;
  }

  const { data: member } = await db
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", session.userId)
    .maybeSingle();

  const role = (member as { role?: string } | null)?.role as MemberRole | undefined;
  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (minRole) {
    const have = MEMBER_ROLE_RANK[role] ?? -1;
    const need = MEMBER_ROLE_RANK[minRole] ?? 0;
    if (have < need) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return null;
}

/**
 * If session is enabled: requires valid session and that the workspace exists and is owned by the session user
 * or the user has a role in workspace_roles. Returns NextResponse (401/404) or null to proceed.
 */
export async function requireWorkspaceAccess(
  req: NextRequest,
  workspaceId: string
): Promise<NextResponse | null> {
  if (!isSessionEnabled()) {
    if (process.env.NODE_ENV === "production") {
      log("error", "[SECURITY] requireWorkspaceAccess called with sessions disabled in production");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null; // Allow in development only
  }
  const session = await getSession(req);
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
  if (!isSessionEnabled()) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
  }
  const session = await getSession(req);
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
