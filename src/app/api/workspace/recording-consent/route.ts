/**
 * GET /api/workspace/recording-consent — Get recording consent settings.
 * PATCH /api/workspace/recording-consent — Update recording consent settings.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { z } from "zod";
import type { RecordingConsentMode } from "@/lib/compliance/recording-consent";

const PATCH_BODY = z.object({
  mode: z.enum(["one_party", "two_party", "none"]),
  announcementText: z.string().max(500).nullable().optional(),
  pauseOnSensitive: z.boolean().optional(),
});

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = session.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({
      mode: "one_party",
      announcementText: null,
      pauseOnSensitive: false,
    });
  }
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;
  const db = getDb();
  const { data, error } = await db
    .from("workspaces")
    .select("recording_consent_mode, recording_consent_announcement, recording_pause_on_sensitive")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const row = data as {
    recording_consent_mode?: string;
    recording_consent_announcement?: string | null;
    recording_pause_on_sensitive?: boolean;
  } | null;
  return NextResponse.json({
    mode: (row?.recording_consent_mode as RecordingConsentMode) ?? "one_party",
    announcementText: row?.recording_consent_announcement ?? null,
    pauseOnSensitive: row?.recording_pause_on_sensitive ?? false,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = session.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PATCH_BODY.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const db = getDb();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    recording_consent_mode: parsed.data.mode,
  };
  if (parsed.data.announcementText !== undefined) {
    update.recording_consent_announcement = parsed.data.announcementText;
  }
  if (parsed.data.pauseOnSensitive !== undefined) {
    update.recording_pause_on_sensitive = parsed.data.pauseOnSensitive;
  }
  const { error } = await db
    .from("workspaces")
    .update(update)
    .eq("id", workspaceId)
    .eq("owner_id", session.userId);
  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({
    mode: parsed.data.mode,
    announcementText: parsed.data.announcementText ?? null,
    pauseOnSensitive: parsed.data.pauseOnSensitive ?? false,
  });
}
