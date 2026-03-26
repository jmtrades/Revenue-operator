/**
 * POST /api/integrations/zapier/actions/create_appointment — Zapier action (Task 22).
 * Body: lead_id, title, start_time, end_time?, location?, notes?.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getWorkspaceIdFromZapierToken } from "@/lib/integrations/zapier-auth";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;


  const workspaceId = await getWorkspaceIdFromZapierToken(req.headers.get("authorization"));
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { lead_id?: string; title?: string; start_time?: string; end_time?: string; location?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lead_id = body.lead_id?.toString().trim();
  const title = (body.title ?? "").toString().trim();
  const start_time = body.start_time?.toString().trim();
  if (!lead_id || !title || !start_time) {
    return NextResponse.json({ error: "lead_id, title, and start_time required" }, { status: 400 });
  }

  const db = getDb();
  const { data: lead } = await db.from("leads").select("id").eq("id", lead_id).eq("workspace_id", workspaceId).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const end_time = body.end_time?.toString().trim() || new Date(new Date(start_time).getTime() + 3600000).toISOString();
  const { data, error } = await db
    .from("appointments")
    .insert({
      workspace_id: workspaceId,
      lead_id: lead_id,
      title,
      start_time,
      end_time,
      location: body.location?.toString().trim() || null,
      notes: body.notes?.toString().trim() || null,
      status: "confirmed",
    })
    .select("id, lead_id, title, start_time, end_time, status, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  return NextResponse.json(data);
}
