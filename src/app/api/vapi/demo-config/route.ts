/**
 * GET /api/vapi/demo-config — Public config for homepage/demo voice (public key + assistant id).
 * Uses VAPI_DEMO_ASSISTANT_ID when set; otherwise for signed-in users uses the workspace's assistant so the homepage widget can test their agent.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() ?? null;
  let assistantId = process.env.VAPI_DEMO_ASSISTANT_ID?.trim() ?? null;

  if (!assistantId && publicKey) {
    const session = await getSession(req).catch(() => null);
    if (session?.workspaceId) {
      try {
        const db = getDb();
        const { data } = await db
          .from("workspaces")
          .select("vapi_assistant_id")
          .eq("id", session.workspaceId)
          .maybeSingle();
        const id = (data as { vapi_assistant_id?: string | null } | null)?.vapi_assistant_id?.trim() ?? null;
        if (id) assistantId = id;
      } catch {
        // ignore
      }
    }
  }

  return NextResponse.json({
    publicKey: publicKey || null,
    assistantId: assistantId || null,
  });
}
