/**
 * Set workspace operating mode (solo, sales, business) for onboarding and defaults.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

const ALLOWED_MODES = ["solo", "sales", "business"] as const;
type WorkspaceMode = (typeof ALLOWED_MODES)[number];

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { mode?: string | null };
  const mode = (body.mode ?? "").toString().trim() as WorkspaceMode;

  if (!ALLOWED_MODES.includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const db = getDb();

  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const { error } = await db
    .from("workspaces")
    .update({ mode })
    .eq("id", session.workspaceId);

  if (error) {
    return NextResponse.json({ error: "Could not update workspace settings. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode });
}
