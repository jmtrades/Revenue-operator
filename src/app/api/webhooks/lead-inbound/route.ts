/**
 * POST /api/webhooks/lead-inbound — Create a lead from an external source (Zapier, Make, form).
 * Auth: session (cookie) with access to workspace_id, or header x-api-key if LEAD_INBOUND_WEBHOOK_SECRET env is set.
 * Body: workspace_id, name, phone, email?, service_requested?, source?, notes?
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

function scoreFromInput(input: { name?: string; phone?: string; email?: string; service_requested?: string; source?: string }): number {
  let score = 0;
  if (input.name?.trim()) score += 10;
  if (input.phone?.trim()) score += 20;
  if (input.email?.trim()) score += 10;
  if (input.service_requested?.trim()) score += 15;
  const src = (input.source ?? "").toLowerCase();
  if (src === "inbound_call") score += 15;
  else if (src === "website") score += 10;
  else if (src === "referral") score += 20;
  return Math.min(100, score);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { workspace_id?: string; name?: string; phone?: string; email?: string; service_requested?: string; source?: string; notes?: string } | null;
  if (!body?.workspace_id || !body?.name?.trim() || !body?.phone?.trim()) {
    return NextResponse.json({ error: "workspace_id, name, and phone are required" }, { status: 400 });
  }
  const workspaceId = String(body.workspace_id).trim();
  const apiKey = req.headers.get("x-api-key")?.trim();
  const secret = process.env.LEAD_INBOUND_WEBHOOK_SECRET?.trim();

  let allowed = false;
  if (secret && apiKey && apiKey === secret) {
    allowed = true;
  } else {
    const session = await getSession(req);
    if (session?.workspaceId === workspaceId) allowed = true;
    else {
      const err = await requireWorkspaceAccess(req, workspaceId);
      if (!err) allowed = true;
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = String(body.name).trim();
  const phone = String(body.phone).trim();
  const email = (body.email ?? "").toString().trim() || null;
  const service_requested = (body.service_requested ?? "").toString().trim() || null;
  const source = (body.source ?? "api").toString().trim() || "api";
  const notes = (body.notes ?? "").toString().trim() || null;
  const score = scoreFromInput({ name, phone, email: email ?? undefined, service_requested: service_requested ?? undefined, source });

  const db = getDb();
  const { data: _lead, error } = await db
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      name,
      phone,
      email,
      company: service_requested,
      state: "new",
      metadata: { source, service_requested, notes, score },
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: "created" });
}
