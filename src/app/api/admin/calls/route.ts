/**
 * GET /api/admin/calls — recent call_sessions across workspaces (admin only).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();

async function isAdmin(req: NextRequest): Promise<boolean> {
  if (!ADMIN_EMAIL) return false;
  const session = await getSession(req);
  if (!session?.userId) return false;
  try {
    const db = getDb();
    const { data } = await db.from("users").select("email").eq("id", session.userId).maybeSingle();
    const email = (data as { email?: string } | null)?.email ?? null;
    return !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let list: { id: string; workspace_id: string | null; summary: string | null; created_at: string }[] = [];
  try {
    const db = getDb();
    const { data } = await db
      .from("call_sessions")
      .select("id, workspace_id, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    list = (data ?? []).map((r: { id?: string; workspace_id?: string | null; summary?: string | null; created_at?: string }) => ({
      id: r.id ?? "",
      workspace_id: r.workspace_id ?? null,
      summary: r.summary ?? null,
      created_at: r.created_at ?? "",
    }));
  } catch {
    // table may not exist
  }
  return NextResponse.json({ calls: list });
}
