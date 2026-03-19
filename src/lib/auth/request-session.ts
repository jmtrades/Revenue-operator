/**
 * Read session from API route request. Prefers Supabase Auth session, then revenue_session cookie.
 * Use for protected routes. All API routes should use: const session = await getSession(req);
 */

import type { NextRequest } from "next/server";
import { getSessionFromCookie } from "./session";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/queries";

export type SessionPayload =
  | { userId: string; workspaceId?: string; emailVerified: boolean }
  | null;

/**
 * Get session: tries Supabase Auth first (session in Supabase cookies), then revenue_session cookie.
 * Use this in all API routes: const session = await getSession(req);
 */
export async function getSession(req: NextRequest): Promise<SessionPayload> {
  // 1) Try Supabase Auth (session set on sign-in via @supabase/ssr)
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
      const workspaceId = (ws as { id: string } | null)?.id ?? undefined;
      return {
        userId: user.id,
        workspaceId,
        emailVerified: Boolean((user as { email_confirmed_at?: string | null }).email_confirmed_at),
      };
    }
  } catch {
    // Supabase not configured or error; fall through to cookie
  }

  // 2) Fallback: revenue_session cookie (set on sign-in for compatibility)
  const cookieHeader = req.headers.get("cookie") ?? null;
  const session = getSessionFromCookie(cookieHeader);
  if (!session) return null;
  return { userId: session.userId, workspaceId: session.workspaceId, emailVerified: false };
}
