/**
 * POST /api/operational/authority-note
 * Record an authority note as one sentence (≤80 chars). Creates orientation statement.
 * Requires workspace access. No internal ids in response.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { sanitizeOrientationText, recordOrientationStatement } from "@/lib/orientation/records";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  let body: { workspace_id?: string; subject_ref?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = body.workspace_id ?? request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId || typeof workspaceId !== "string") {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  const raw = typeof body.text === "string" ? body.text : "";
  const sanitized = sanitizeOrientationText(raw);

  await recordOrientationStatement(workspaceId, sanitized);

  return NextResponse.json({ ok: true, recorded: sanitized });
}
