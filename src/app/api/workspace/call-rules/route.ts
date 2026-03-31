/**
 * GET/PATCH /api/workspace/call-rules — Read/update call-handling rules for a workspace.
 * Stores after_hours_behavior, emergency_keywords, transfer_phone in the settings table.
 * Also handles business_hours from the workspaces table.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

type BusinessHours = {
  [day: string]: { open: string; close: string; enabled: boolean };
};

function getDefaultBusinessHours(): BusinessHours {
  return {
    monday: { open: "09:00", close: "17:00", enabled: true },
    tuesday: { open: "09:00", close: "17:00", enabled: true },
    wednesday: { open: "09:00", close: "17:00", enabled: true },
    thursday: { open: "09:00", close: "17:00", enabled: true },
    friday: { open: "09:00", close: "17:00", enabled: true },
    saturday: { open: "", close: "", enabled: false },
    sunday: { open: "", close: "", enabled: false },
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const [settingsRes, workspaceRes] = await Promise.all([
    db
      .from("settings")
      .select("after_hours_behavior, emergency_keywords, transfer_phone")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    db
      .from("workspaces")
      .select("business_hours")
      .eq("id", workspaceId)
      .maybeSingle(),
  ]);

  const settings = settingsRes.data as {
    after_hours_behavior?: string;
    emergency_keywords?: string;
    transfer_phone?: string;
  } | null;

  const workspace = workspaceRes.data as {
    business_hours?: Record<string, { start: string; end: string } | null> | null;
  } | null;

  // Convert existing business_hours format to new format if it exists
  let businessHours = getDefaultBusinessHours();
  if (workspace?.business_hours) {
    const existing = workspace.business_hours;
    for (const day of Object.keys(businessHours)) {
      if (existing[day]) {
        businessHours[day] = {
          open: existing[day]!.start,
          close: existing[day]!.end,
          enabled: true,
        };
      }
    }
  }

  return NextResponse.json({
    after_hours_behavior: settings?.after_hours_behavior ?? "messages",
    emergency_keywords: settings?.emergency_keywords ?? "emergency, urgent",
    transfer_phone: settings?.transfer_phone ?? "",
    business_hours: businessHours,
  });
}

export async function PATCH(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  let body: {
    workspace_id?: string;
    after_hours_behavior?: string;
    emergency_keywords?: string;
    transfer_phone?: string;
    business_hours?: BusinessHours;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id.trim() : "";
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  // Update settings table
  const settingsUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.after_hours_behavior) settingsUpdates.after_hours_behavior = body.after_hours_behavior;
  if (typeof body.emergency_keywords === "string") settingsUpdates.emergency_keywords = body.emergency_keywords;
  if (typeof body.transfer_phone === "string") settingsUpdates.transfer_phone = body.transfer_phone;

  const { error: settingsError } = await db
    .from("settings")
    .update(settingsUpdates)
    .eq("workspace_id", workspaceId);

  if (settingsError) {
    log("error", "[call-rules] Settings update failed:", { error: settingsError });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Update workspaces table with business_hours if provided
  if (body.business_hours) {
    // Convert new format back to the format stored in workspaces table
    const legacyFormat: Record<string, { start: string; end: string } | null> = {};
    for (const [day, hours] of Object.entries(body.business_hours)) {
      if (hours.enabled && hours.open && hours.close) {
        legacyFormat[day] = { start: hours.open, end: hours.close };
      } else {
        legacyFormat[day] = null;
      }
    }

    const { error: workspaceError } = await db
      .from("workspaces")
      .update({ business_hours: legacyFormat, updated_at: new Date().toISOString() })
      .eq("id", workspaceId);

    if (workspaceError) {
      log("error", "[call-rules] Business hours update failed:", { error: workspaceError });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
