/**
 * GET /api/vapi/demo-config — Public config for demo page voice (public key + demo assistant id).
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() ?? null;
  const assistantId = process.env.VAPI_DEMO_ASSISTANT_ID?.trim() ?? null;
  return NextResponse.json({
    publicKey: publicKey || null,
    assistantId: assistantId || null,
  });
}
