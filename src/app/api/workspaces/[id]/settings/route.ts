/**
 * Workspace settings: risk level, business hours, forbidden phrases, VIP rules.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const { data, error } = await db
    .from("settings")
    .select("*")
    .eq("workspace_id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
  return NextResponse.json(data ?? {
    risk_level: "balanced",
    preview_mode: false,
    business_hours: { start: "09:00", end: "17:00", timezone: "UTC", days: [1, 2, 3, 4, 5] },
    forbidden_phrases: [],
    vip_rules: { exclude_from_messaging: false, exclude_from_calls: false, domains: [] },
    opt_out_keywords: ["stop", "unsubscribe"],
    safe_fallback_action: "clarifying_question",
    recovery_profile: "standard",
    operational_profile: "org",
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const prev = await db.from("settings").select("operational_profile").eq("workspace_id", id).maybeSingle();
  const prevProfile = (prev?.data as { operational_profile?: string } | null)?.operational_profile;
  const nextProfile = typeof body.operational_profile === "string" ? body.operational_profile : undefined;

  const { data, error } = await db
    .from("settings")
    .upsert(
      {
        workspace_id: id,
        ...body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

  if (nextProfile && nextProfile !== prevProfile) {
    const { recordOrientationStatement } = await import("@/lib/orientation/records");
    recordOrientationStatement(id, "The operating profile was updated.").catch(() => {});
  }

  return NextResponse.json(data);
}
