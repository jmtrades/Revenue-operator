/**
 * Returns current session from cookie so client can show "Restoring..." and account info.
 * Never returns 500: on any failure returns 200 with { session: null }.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { isSessionEnabled } from "@/lib/auth/session";
import { logSessionRestore } from "@/lib/reliability/logging";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  try {
    if (!isSessionEnabled()) {
      return NextResponse.json({ session: null });
    }
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ session: null });
    }

    if (session.userId && session.workspaceId) {
      logSessionRestore(session.userId, session.workspaceId);
    }

    let email: string | null = null;
    try {
      const db = getDb();
      const { data } = await db.from("users").select("email").eq("id", session.userId).single();
      email = (data as { email?: string } | null)?.email ?? null;
    } catch {
      // ignore
    }
    return NextResponse.json({
      session: {
        userId: session.userId,
        user_id: session.userId,
        workspaceId: session.workspaceId ?? null,
        workspace_id: session.workspaceId ?? null,
        email,
      },
    });
  } catch {
    return NextResponse.json({ session: null });
  }
}
