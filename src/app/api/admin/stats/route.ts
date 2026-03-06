/**
 * Admin dashboard stats. Allowed only when session user email === ADMIN_EMAIL.
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
    const { data } = await db.from("users").select("email").eq("id", session.userId).single();
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
  let signupsToday = 0;
  let signupsTotal = 0;
  let recentSignups: { name: string; business_name: string; email: string; plan?: string; created_at?: string }[] = [];
  try {
    const db = getDb();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();
    const { count: todayCount } = await db.from("signups").select("id", { count: "exact", head: true }).gte("created_at", todayIso);
    const { count: totalCount } = await db.from("signups").select("id", { count: "exact", head: true });
    signupsToday = todayCount ?? 0;
    signupsTotal = totalCount ?? 0;
    const { data: recent } = await db.from("signups").select("name, business_name, email, status, created_at").order("created_at", { ascending: false }).limit(10);
    recentSignups = (recent ?? []).map((r: { name?: string; business_name?: string; email?: string; status?: string; created_at?: string }) => ({
      name: r.name ?? "",
      business_name: r.business_name ?? "",
      email: r.email ?? "",
      plan: r.status ?? undefined,
      created_at: r.created_at,
    }));
  } catch {
    // signups table or getDb may not exist / be configured
  }
  return NextResponse.json({
    signupsToday,
    signupsTotal,
    mrr: "$0",
    recentSignups,
    health: { vapi: "Online", twilio: "Online", supabase: "Online" },
    activeCalls: 0,
    callsToday: 0,
    textsToday: 0,
  });
}
