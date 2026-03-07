/**
 * GET /api/leads/by-phone?phone= — Resolve lead by phone in current workspace.
 * Returns { lead_id, name } for composing messages; 404 if not found.
 */

export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const phone = req.nextUrl.searchParams.get("phone")?.trim();
  if (!phone) {
    return NextResponse.json({ error: "phone required" }, { status: 400 });
  }

  const db = getDb();
  const { data: leads } = await db
    .from("leads")
    .select("id, name, phone")
    .eq("workspace_id", session.workspaceId);
  const needle = normalizePhone(phone);
  const match = (leads ?? []).find((l: { phone?: string | null }) => needle && normalizePhone((l.phone ?? "") || "") === needle);
  if (!match) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  const row = match as { id: string; name: string | null };
  return NextResponse.json({ lead_id: row.id, name: row.name?.trim() ?? null });
}
