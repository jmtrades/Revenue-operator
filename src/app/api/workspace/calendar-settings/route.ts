/**
 * GET /api/workspace/calendar-settings — Buffer minutes for current workspace.
 * PATCH /api/workspace/calendar-settings — Update buffer (0–120).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const { data } = await db
    .from("workspaces")
    .select("calendar_buffer_minutes")
    .eq("id", session.workspaceId)
    .single();

  const row = data as { calendar_buffer_minutes?: number } | null;
  const buffer = row?.calendar_buffer_minutes ?? 15;
  return NextResponse.json({ calendar_buffer_minutes: Math.min(120, Math.max(0, buffer)) });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { calendar_buffer_minutes?: number };
  try {
    body = (await req.json()) as { calendar_buffer_minutes?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.calendar_buffer_minutes;
  const calendar_buffer_minutes =
    typeof raw === "number" ? Math.min(120, Math.max(0, Math.round(raw))) : 15;

  const db = getDb();
  const { error } = await db
    .from("workspaces")
    .update({
      calendar_buffer_minutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.workspaceId);

  if (error) return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  return NextResponse.json({ calendar_buffer_minutes });
}
