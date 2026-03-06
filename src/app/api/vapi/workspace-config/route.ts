/**
 * GET /api/vapi/workspace-config — Public config for the current workspace agent.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ publicKey: null, assistantId: null });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() ?? null;
  if (!publicKey) {
    return NextResponse.json({ publicKey: null, assistantId: null });
  }

  const db = getDb();
  const { data } = await db
    .from("workspaces")
    .select("vapi_assistant_id")
    .eq("id", session.workspaceId)
    .maybeSingle();

  const assistantId = (data as { vapi_assistant_id?: string | null } | null)?.vapi_assistant_id ?? null;
  return NextResponse.json({
    publicKey,
    assistantId,
  });
}
