/**
 * Admin access check: allowed only if session user email matches ADMIN_EMAIL.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();

export async function GET(req: NextRequest) {
  if (!ADMIN_EMAIL) {
    return NextResponse.json({ allowed: false, reason: "Admin not configured" });
  }
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ allowed: false, reason: "Not signed in" });
  }
  let email: string | null = null;
  try {
    const db = getDb();
    const { data } = await db.from("users").select("email").eq("id", session.userId).single();
    email = (data as { email?: string } | null)?.email ?? null;
  } catch {
    // ignore
  }
  const allowed = !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
  return NextResponse.json({ allowed, reason: allowed ? undefined : "Access denied" });
}
