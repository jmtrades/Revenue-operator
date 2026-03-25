/**
 * PATCH /api/workspace/timezone — Update workspace timezone.
 * GET /api/workspace/timezone — Get workspace timezone.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/http/csrf";

const PATCH_BODY = z.object({ timezone: z.string().min(1).max(64) });

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = session.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ timezone: "America/New_York" });
  }
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data, error } = await db
    .from("workspaces")
    .select("timezone")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const timezone = (data as { timezone?: string } | null)?.timezone ?? "America/New_York";
  return NextResponse.json({ timezone });
}

export async function PATCH(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = session.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }
  const authErrPatch = await requireWorkspaceAccess(req, workspaceId);
  if (authErrPatch) return authErrPatch;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PATCH_BODY.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }
  const db = getDb();
  const { error } = await db
    .from("workspaces")
    .update({ timezone: parsed.data.timezone, updated_at: new Date().toISOString() })
    .eq("id", workspaceId)
    .eq("owner_id", session.userId);
  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ timezone: parsed.data.timezone });
}
