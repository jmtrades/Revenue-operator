/**
 * Twilio: provision proxy number for workspace
 * When TWILIO_* env vars set, provisions. Otherwise marks pending for manual config.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function POST(req: NextRequest) {
  let workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    try {
      const b = await req.json();
      workspaceId = b.workspace_id;
    } catch {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }
  }
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const proxyNumber = process.env.TWILIO_PROXY_NUMBER ?? null;

  await db.from("phone_configs").upsert(
    {
      workspace_id: workspaceId,
      mode: "proxy",
      proxy_number: proxyNumber,
      status: proxyNumber ? "active" : "pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" }
  ).select().single();

  return NextResponse.json({
    proxy_number: proxyNumber,
    status: proxyNumber ? "active" : "pending",
    message: proxyNumber ? "Protection active" : "Set TWILIO_PROXY_NUMBER for full proxy. Calendar and post-call still protected.",
  });
}
