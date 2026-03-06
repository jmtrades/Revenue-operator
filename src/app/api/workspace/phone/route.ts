/**
 * GET /api/workspace/phone — Phone number and status for current workspace.
 * Used by Settings > Phone and empty states to show real number or "Connect number".
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { data } = await db
    .from("phone_configs")
    .select("proxy_number, status")
    .eq("workspace_id", session.workspaceId)
    .eq("status", "active")
    .maybeSingle();

  const cfg = data as { proxy_number?: string | null; status?: string } | null;
  return NextResponse.json({
    phone_number: cfg?.proxy_number ?? null,
    status: cfg?.status ?? null,
  });
}
