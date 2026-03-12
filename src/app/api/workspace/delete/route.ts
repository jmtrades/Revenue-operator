/**
 * POST /api/workspace/delete — Delete the current workspace (owner only).
 * Body: { confirm: string } — must match workspace name exactly.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { confirm?: string };
  try {
    body = (await req.json()) as { confirm?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const confirm = (body.confirm ?? "").toString().trim();
  if (!confirm)
    return NextResponse.json({ error: "Type the workspace name to confirm" }, { status: 400 });

  const db = getDb();
  const { data: ws, error: fetchErr } = await db
    .from("workspaces")
    .select("id, name, owner_id")
    .eq("id", session.workspaceId)
    .single();

  if (fetchErr || !ws)
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const row = ws as { id: string; name?: string | null; owner_id: string };
  if (row.owner_id !== session.userId)
    return NextResponse.json({ error: "Only the workspace owner can delete it" }, { status: 403 });

  const workspaceName = (row.name ?? "My Workspace").trim();
  if (confirm !== workspaceName)
    return NextResponse.json({ error: "Workspace name does not match. Type it exactly to confirm." }, { status: 400 });

  const { error: deleteErr } = await db
    .from("workspaces")
    .delete()
    .eq("id", session.workspaceId);

  if (deleteErr)
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
