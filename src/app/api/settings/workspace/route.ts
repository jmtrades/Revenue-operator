export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  try {
    const db = getDb();
    const { data: workspace, error } = await db
      .from("workspaces")
      .select("id, name, settings, created_at")
      .eq("id", session.workspaceId)
      .maybeSingle();

    const pgCode = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    if (error && pgCode !== "PGRST116") {
      log("error", "api.settings.get_failed", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
    }

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const settings = (workspace.settings ?? {}) as Record<string, unknown>;

    return NextResponse.json({
      workspace_id: workspace.id,
      name: workspace.name,
      settings: {
        recording_enabled: settings.recording_enabled ?? true,
        recording_disclaimer: settings.recording_disclaimer ?? "This call may be recorded for quality assurance.",
        tcpa_compliance: settings.tcpa_compliance ?? true,
        calling_hours_start: settings.calling_hours_start ?? "09:00",
        calling_hours_end: settings.calling_hours_end ?? "20:00",
        calling_days: settings.calling_days ?? [1, 2, 3, 4, 5],
        timezone: settings.timezone ?? "America/New_York",
        max_attempts_per_lead: settings.max_attempts_per_lead ?? 3,
        retry_delay_minutes: settings.retry_delay_minutes ?? 60,
        voicemail_behavior: settings.voicemail_behavior ?? "drop",
        auto_dnc_on_request: settings.auto_dnc_on_request ?? true,
        sentiment_escalation_enabled: settings.sentiment_escalation_enabled ?? true,
        escalation_threshold: settings.escalation_threshold ?? "warning",
        webhook_signing_enabled: settings.webhook_signing_enabled ?? true,
        ai_coaching_enabled: settings.ai_coaching_enabled ?? true,
        nps_survey_enabled: settings.nps_survey_enabled ?? false,
      },
    });
  } catch (err) {
    log("error", "api.settings.get_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  try {
    let body: { workspace_id?: string; settings?: Record<string, unknown> };
    try {
      body = (await req.json()) as { workspace_id?: string; settings?: Record<string, unknown> };
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const workspaceId = body.workspace_id || session.workspaceId;
    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });
    }

    if (!body.settings || typeof body.settings !== "object") {
      return NextResponse.json({ error: "Missing or invalid settings" }, { status: 400 });
    }

    const db = getDb();

    // Get current settings
    const { data: current, error: fetchError } = await db
      .from("workspaces")
      .select("settings")
      .eq("id", workspaceId)
      .maybeSingle();

    if (fetchError) {
      log("error", "api.settings.fetch_failed", { error: fetchError instanceof Error ? fetchError.message : String(fetchError) });
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }

    const currentSettings = (current?.settings ?? {}) as Record<string, unknown>;
    const merged = { ...currentSettings, ...body.settings };

    const { error: updateError } = await db
      .from("workspaces")
      .update({ settings: merged, updated_at: new Date().toISOString() })
      .eq("id", workspaceId);

    if (updateError) {
      log("error", "api.settings.update_failed", { error: updateError instanceof Error ? updateError.message : String(updateError) });
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    log("info", "api.settings.updated", { workspace_id: workspaceId, keys: Object.keys(body.settings) });
    return NextResponse.json({ ok: true, settings: merged });
  } catch (err) {
    log("error", "api.settings.update_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

