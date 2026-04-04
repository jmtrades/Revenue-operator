/**
 * GET /api/recordings/[id]/audio — Stream recording audio from provider (Telnyx/Twilio).
 * Proxies the audio through our server so provider URLs are never exposed to the client.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const { id } = await ctx.params;
  const db = getDb();

  // Try call_recordings table first (recording_sid match)
  const { data: recording } = await db
    .from("call_recordings")
    .select("id, recording_sid, workspace_id, call_session_id")
    .eq("workspace_id", session.workspaceId)
    .or(`recording_sid.eq.${id},id.eq.${id}`)
    .maybeSingle();

  let audioUrl: string | null = null;

  if (recording) {
    // Look up the provider URL from call_sessions metadata
    const { data: callSession } = await db
      .from("call_sessions")
      .select("metadata")
      .eq("id", (recording as { call_session_id: string }).call_session_id)
      .maybeSingle();

    const meta = (callSession as { metadata?: Record<string, unknown> } | null)?.metadata;
    const rec = meta?.recording as { url?: string } | undefined;
    audioUrl = rec?.url ?? null;
  }

  // Fallback: look directly in call_sessions metadata by recording sid
  if (!audioUrl) {
    const { data: sessions } = await db
      .from("call_sessions")
      .select("metadata")
      .eq("workspace_id", session.workspaceId)
      .limit(50)
      .order("created_at", { ascending: false });

    for (const s of sessions ?? []) {
      const meta = (s as { metadata?: Record<string, unknown> }).metadata;
      const rec = meta?.recording as { sid?: string; url?: string; id?: string } | undefined;
      if (rec && (rec.sid === id || rec.id === id) && rec.url) {
        audioUrl = rec.url;
        break;
      }
    }
  }

  if (!audioUrl) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  // Proxy the audio from the provider
  try {
    const telnyxApiKey = process.env.TELNYX_API_KEY;
    const headers: Record<string, string> = {};
    if (telnyxApiKey && audioUrl.includes("telnyx")) {
      headers["Authorization"] = `Bearer ${telnyxApiKey}`;
    }

    const providerRes = await fetch(audioUrl, {
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (!providerRes.ok) {
      log("warn", "recordings.audio_proxy_failed", {
        recordingId: id,
        status: providerRes.status,
      });
      return NextResponse.json({ error: "Recording unavailable" }, { status: 502 });
    }

    const contentType = providerRes.headers.get("content-type") || "audio/mpeg";
    const contentLength = providerRes.headers.get("content-length");
    const body = providerRes.body;

    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    };
    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

    return new NextResponse(body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err) {
    log("error", "recordings.audio_proxy_error", {
      recordingId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to stream recording" }, { status: 500 });
  }
}
