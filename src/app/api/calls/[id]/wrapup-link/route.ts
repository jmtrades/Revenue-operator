/**
 * Create wrap-up link for a call session and optionally deliver via webhook (e.g. Slack).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { createWrapupTokenForCall } from "@/lib/calls/wrapup-token";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: callSessionId } = await params;
  const db = getDb();

  const { data: session } = await db
    .from("call_sessions")
    .select("workspace_id")
    .eq("id", callSessionId)
    .single();
  if (!session) return NextResponse.json({ error: "Call session not found" }, { status: 404 });
  const workspaceId = (session as { workspace_id: string }).workspace_id;

  const { url } = await createWrapupTokenForCall(workspaceId, callSessionId);

  const { data: webhook } = await db
    .from("webhook_configs")
    .select("endpoint_url, enabled")
    .eq("workspace_id", workspaceId)
    .single();

  if (webhook && (webhook as { enabled?: boolean }).enabled !== false && (webhook as { endpoint_url?: string }).endpoint_url) {
    const endpoint = (webhook as { endpoint_url: string }).endpoint_url;
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "call_wrapup_link",
          call_session_id: callSessionId,
          wrapup_url: url,
          message: "Call wrap-up: " + url,
        }),
      });
    } catch {
      // non-blocking
    }
  }

  return NextResponse.json({ url, expires_in_days: 7 });
}
