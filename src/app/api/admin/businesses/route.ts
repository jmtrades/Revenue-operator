/**
 * GET /api/admin/businesses — list workspaces (admin only).
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
  let list: { id: string; name: string; owner_id: string | null; created_at: string }[] = [];
  try {
    const db = getDb();
    const { data } = await db.from("workspaces").select("id, name, owner_id, created_at").order("created_at", { ascending: false }).limit(200);
    list = (data ?? []).map((r: { id?: string; name?: string; owner_id?: string | null; created_at?: string }) => ({
      id: r.id ?? "",
      name: r.name ?? "—",
      owner_id: r.owner_id ?? null,
      created_at: r.created_at ?? "",
    }));
  } catch {
    // table may not exist
  }
  return NextResponse.json({ businesses: list });
}
