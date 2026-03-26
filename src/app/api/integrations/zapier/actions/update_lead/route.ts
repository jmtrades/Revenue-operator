/**
 * POST /api/integrations/zapier/actions/update_lead — Zapier action (Task 22).
 * Body: id (required), name?, phone?, email?, company?, state?.
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

  let body: { id?: string; name?: string; phone?: string; email?: string; company?: string; state?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = body.id?.toString().trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  const { data: existing } = await db.from("leads").select("id").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const updates: { name?: string; phone?: string; email?: string | null; company?: string | null; status?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (body.name !== undefined) updates.name = body.name.toString().trim();
  if (body.phone !== undefined) updates.phone = body.phone.toString().trim();
  if (body.email !== undefined) updates.email = body.email.toString().trim() || null;
  if (body.company !== undefined) updates.company = body.company.toString().trim() || null;
  if (body.state !== undefined) updates.status = body.state.toString().toLowerCase().replace(/\s+/g, "_");

  const { data, error } = await db.from("leads").update(updates).eq("id", id).select("id, name, phone, email, company, state").maybeSingle();
  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  return NextResponse.json(data);
}
