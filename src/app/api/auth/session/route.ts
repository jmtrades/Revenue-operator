/**
 * Returns current session from cookie so client can show "Restoring..." and account info.
 * Never returns 500: on any failure returns 200 with { session: null }.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { logSessionRestore } from "@/lib/reliability/logging";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const nullResponse = () => {
    const res = NextResponse.json({ session: null });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  };

  const json = (body: { session: Record<string, unknown> }) => {
    const res = NextResponse.json(body);
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  };

  try {
    const session = await getSession(req);
    if (!session) {
      return nullResponse();
    }

    if (session.userId && session.workspaceId) {
      logSessionRestore(session.userId, session.workspaceId);
    }

    let email: string | null = null;
    let displayName: string | null = null;
    try {
      const db = getDb();
      const { data } = await db.from("users").select("email, full_name").eq("id", session.userId).maybeSingle();
      const userData = data as { email?: string; full_name?: string } | null;
      email = userData?.email ?? null;
      displayName = userData?.full_name ?? null;
    } catch {
      // ignore
    }
    return json({
      session: {
        userId: session.userId,
        user_id: session.userId,
        workspaceId: session.workspaceId ?? null,
        workspace_id: session.workspaceId ?? null,
        email,
        displayName,
        emailVerified: session.emailVerified,
      },
    });
  } catch {
    return nullResponse();
  }
}
