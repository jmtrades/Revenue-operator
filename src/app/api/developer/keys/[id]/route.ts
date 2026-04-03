/**
 * DELETE /api/developer/keys/[id] — Revoke an API key.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId || !session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  // Rate limit: 10 revokes per minute per workspace
  const rl = await checkRateLimit(`dev_keys_revoke:${session.workspaceId}`, 10, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const { id } = await ctx.params;
  const db = getDb();

  // Verify key belongs to this workspace
  const { data: existing } = await db
    .from("developer_api_keys")
    .select("id, workspace_id, status")
    .eq("id", id)
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  if ((existing as { status: string }).status === "revoked") {
    return NextResponse.json({ error: "Key already revoked" }, { status: 400 });
  }

  const { error } = await db
    .from("developer_api_keys")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", session.workspaceId);

  if (error) {
    log("error", "developer.keys.revoke_error", { error: error.message });
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
