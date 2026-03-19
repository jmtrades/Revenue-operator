/**
 * GET /api/vapi/demo-config — DEPRECATED. Vapi support has been removed.
 * DEPRECATED: This Vapi-specific endpoint is no longer maintained.
 * Use the Recall voice system instead.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated",
      message: "Vapi integration is no longer supported. The Recall voice system is now the default.",
      publicKey: null,
      assistantId: null,
    },
    { status: 410 }
  );
}
