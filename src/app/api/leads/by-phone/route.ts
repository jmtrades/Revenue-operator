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

/**
 * Normalize phone to E.164 digits for comparison.
 * Keeps full country code to avoid false matches across countries.
 * 10-digit numbers (US/CA without country code) get "1" prepended.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  return digits;
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
  const needle = normalizePhone(phone);

  if (!needle) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  // Build multiple phone format variants for DB-level matching
  const variants = [
    phone.trim(),
    needle,
    `+${needle}`,
    `+1${needle.length === 10 ? needle : ""}`.replace("+1", "+1"),
  ].filter(Boolean);

  // Use database-level OR filter instead of fetching all leads
  const { data: leads } = await db
    .from("leads")
    .select("id, name, phone")
    .eq("workspace_id", session.workspaceId)
    .or(variants.map(v => `phone.eq.${v}`).join(","))
    .limit(1);

  const row = (leads ?? [])[0] as { id: string; name: string | null } | undefined;
  if (!row) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  return NextResponse.json({ lead_id: row.id, name: row.name?.trim() ?? null });
}
