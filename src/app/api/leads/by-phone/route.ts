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
import { normalizePhone } from "@/lib/security/phone";

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

  // Phase 78/Phase 3 (D7): `phone` is a URL query parameter and
  // attacker-controlled. The previous implementation built a `variants` array
  // that included the raw `phone.trim()` — a comma or `.or.` there would graft
  // an arbitrary filter onto the PostgREST query. `normalizePhone` fails
  // closed and returns null for anything that isn't strict E.164-producible.
  const e164 = normalizePhone(phone);
  if (!e164) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }
  const digits = e164.slice(1); // strip leading '+'

  const db = getDb();
  const { data: leads } = await db
    .from("leads")
    .select("id, name, phone")
    .eq("workspace_id", session.workspaceId)
    .or(`phone.eq.${e164},phone.eq.${digits}`)
    .limit(1);

  const row = (leads ?? [])[0] as { id: string; name: string | null } | undefined;
  if (!row) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  return NextResponse.json({ lead_id: row.id, name: row.name?.trim() ?? null });
}
