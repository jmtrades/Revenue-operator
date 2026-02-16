/**
 * Require session and workspace ownership for workspace-scoped APIs.
 * When session is disabled (dev), allows access. When enabled, returns 401/404 or null (proceed).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession } from "./request-session";
import { isSessionEnabled } from "./session";
import { getDb } from "@/lib/db/queries";

/**
 * If session is enabled: requires valid session and that the workspace exists and is owned by the session user.
 * Returns NextResponse (401 Unauthorized or 404 Not Found) or null to proceed.
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
  if (!ws || (ws as { owner_id: string }).owner_id !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}
