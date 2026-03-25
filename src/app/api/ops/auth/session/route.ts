/**
 * Get current staff session
 * GET - returns session or 401
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/ops/auth";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    id: session.id,
    email: session.email,
    role: session.role,
    impersonationWorkspaceId: session.impersonationWorkspaceId,
    writeAccessEnabled: session.writeAccessEnabled,
  });
}
