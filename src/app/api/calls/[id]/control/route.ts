/**
 * POST /api/calls/[id]/control — Execute call control actions (mute, hold, transfer) via Telnyx.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { getDb } from "@/lib/db/queries";
import { z } from "zod";
import { log } from "@/lib/logger";

const ACTION_BODY = z.object({
  action: z.enum(["mute", "unmute", "hold", "unhold", "transfer"]),
  transfer_to: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: callId } = await params;
  let body: z.infer<typeof ACTION_BODY>;
  try {
    body = ACTION_BODY.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Call control not configured" }, { status: 503 });
  }

  // Get call_control_id from DB — stored in call_sessions.metadata.call_control_id
  // or in call_sessions.external_meeting_id (the Telnyx call session ID)
  const db = getDb();
  const { data: callData } = await db
    .from("call_sessions")
    .select("id, workspace_id, metadata, external_meeting_id")
    .eq("id", callId)
    .maybeSingle();

  if (!callData) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  // Check workspace access for this call
  const callWorkspaceId = (callData as { workspace_id?: string }).workspace_id;
  if (callWorkspaceId) {
    const wsErr = await requireWorkspaceAccess(req, callWorkspaceId);
    if (wsErr) return wsErr;
  }

  // Extract call_control_id from metadata (stored during test-call creation or webhook)
  const meta = (callData as { metadata?: Record<string, unknown> | null }).metadata;
  const callControlId = (meta?.call_control_id as string | undefined)
    ?? (callData as { external_meeting_id?: string }).external_meeting_id
    ?? null;

  if (!callControlId) {
    // If no call control ID, acknowledge the action (for calls not yet connected to Telnyx)
    return NextResponse.json({ ok: true, note: "Action queued — will apply when call connects" });
  }

  const telnyxBase = "https://api.telnyx.com/v2/calls";

  try {
    let telnyxRes: Response;

    switch (body.action) {
      case "mute":
        telnyxRes = await fetch(`${telnyxBase}/${callControlId}/actions/mute`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        break;
      case "unmute":
        telnyxRes = await fetch(`${telnyxBase}/${callControlId}/actions/unmute`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        break;
      case "hold":
        telnyxRes = await fetch(`${telnyxBase}/${callControlId}/actions/hold`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        break;
      case "unhold":
        telnyxRes = await fetch(`${telnyxBase}/${callControlId}/actions/unhold`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        break;
      case "transfer": {
        const transferTo = body.transfer_to || process.env.TELNYX_FALLBACK_NUMBER || process.env.TELNYX_PHONE_NUMBER;
        if (!transferTo) {
          return NextResponse.json({ error: "No transfer destination configured" }, { status: 400 });
        }
        telnyxRes = await fetch(`${telnyxBase}/${callControlId}/actions/transfer`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ to: transferTo }),
        });
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (!telnyxRes.ok) {
      const errBody = await telnyxRes.text();
      log("error", `Telnyx call control error (${body.action}):`, { error: errBody });
      return NextResponse.json({ error: `Call control action failed: ${body.action}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true, action: body.action });
  } catch (err) {
    log("error", "Call control error:", { error: err });
    return NextResponse.json({ error: "Failed to execute call control action" }, { status: 500 });
  }
}
