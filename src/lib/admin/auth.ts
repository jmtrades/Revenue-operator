/**
 * Shared admin authentication helper.
 * All admin routes use this to check if the user is the admin.
 */

import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();

export async function isAdmin(req: NextRequest): Promise<boolean> {
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

export function forbidden() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
