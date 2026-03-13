/**
 * POST /api/errors/report — Record client error (error boundary or unhandled rejection). No PII.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { message?: string; stack?: string | null; error_type?: string; page_url?: string | null; user_agent?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = (body.message ?? "Unknown error").toString().trim().slice(0, 2000);
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

  const session = await getSession(req);
  const workspaceId = session?.workspaceId ?? null;
  if (workspaceId) {
    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;
  }

  const db = getDb();

  try {
    await db.from("error_reports").insert({
      workspace_id: workspaceId,
      user_id: session?.userId ?? null,
      error_message: message,
      stack_trace: (body.stack ?? null)?.toString().trim().slice(0, 10000) ?? null,
      error_type: (body.error_type ?? "unknown").toString().slice(0, 64) ?? null,
      page_url: (body.page_url ?? null)?.toString().trim().slice(0, 2048) ?? null,
      user_agent: (body.user_agent ?? null)?.toString().trim().slice(0, 512) ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save report" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
