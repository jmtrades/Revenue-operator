/**
 * GET /api/integrations/outlook-calendar/status — Placeholder for Microsoft Outlook Calendar (Task 20).
 * Returns connected: false until Outlook OAuth and sync are implemented.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ connected: false });
  }
  return NextResponse.json({ connected: false });
}
