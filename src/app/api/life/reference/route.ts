/**
 * POST /api/life/reference
 * Individual life surface: add a personal reference (applications, claims, approvals, responses).
 * Body: { workspace_id, label, category? }. Auth required.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

const MAX_LABEL = 200;
const MAX_CATEGORY = 50;

export async function POST(request: NextRequest) {
  let body: { workspace_id?: string; label?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const workspaceId = body.workspace_id;
  const label = typeof body.label === "string" ? body.label.trim().slice(0, MAX_LABEL) : "";
  const category = typeof body.category === "string" ? body.category.trim().slice(0, MAX_CATEGORY) || "general" : "general";

  if (!workspaceId || !label) {
    return NextResponse.json({ error: "workspace_id and label required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: row, error } = await db
    .from("personal_references")
    .insert({ workspace_id: workspaceId, label, category })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: (row as { id: string }).id });
}
