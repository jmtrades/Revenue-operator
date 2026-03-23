/**
 * POST /api/integrations/zapier/actions/create_lead — Zapier action (Task 22).
 * Body: name, phone, email?, company?. Auth: Bearer.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getWorkspaceIdFromZapierToken } from "@/lib/integrations/zapier-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const workspaceId = await getWorkspaceIdFromZapierToken(req.headers.get("authorization"));
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; phone?: string; email?: string; company?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").toString().trim();
  const phone = (body.phone ?? "").toString().trim();
  if (!name || !phone) return NextResponse.json({ error: "name and phone required" }, { status: 400 });

  const db = getDb();
  const { data, error } = await db
    .from("leads")
    .insert({
      workspace_id: workspaceId,
      name,
      phone,
      email: (body.email ?? "").toString().trim() || null,
      company: (body.company ?? "").toString().trim() || null,
      status: "new",
      metadata: { source: "zapier" },
    })
    .select("id, name, phone, email, company, state, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  return NextResponse.json({ id: (data as { id: string }).id, ...(data as object) });
}
