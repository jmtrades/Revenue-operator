/**
 * POST /api/onboarding/number — Screen 4: provision phone number for workspace.
 * Returns { phone_number } or stub number when Twilio not configured.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getTelephonyService } from "@/lib/telephony";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  let body: { workspace_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const workspace_id = body.workspace_id;
  if (!workspace_id) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspace_id);
  if (authErr) return authErr;

  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("id").eq("id", workspace_id).maybeSingle();
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl?.origin ?? "";
  const _voiceWebhookUrl =
    process.env.VOICE_PROVIDER === "pipecat"
      ? `${baseUrl}/api/voice/connect`
      : `${baseUrl}/api/webhooks/twilio/voice`;

  try {
    const telephony = getTelephonyService();

    // Search for available numbers with limit of 5
    const searchResult = await telephony.searchAvailableNumbers({
      areaCode: "US",
      limit: 5,
    });

    if ("error" in searchResult || searchResult.length === 0) {
      throw new Error("No available numbers");
    }

    const num = searchResult[0].phone_number;

    // Purchase the first available number
    const purchaseResult = await telephony.purchaseNumber(num);

    if ("error" in purchaseResult) {
      throw new Error(purchaseResult.error);
    }

    const existing = await db.from("phone_configs").select("id").eq("workspace_id", workspace_id).maybeSingle();
    if (!existing) {
      await db.from("phone_configs").insert({
        workspace_id,
        proxy_number: num,
        status: "active",
        twilio_phone_sid: purchaseResult.numberId,
      });
    }
    return NextResponse.json({ phone_number: num });
  } catch (e) {
    log("error", "[Onboarding] Phone provisioning failed:", { error: e });
    return NextResponse.json(
      { error: "Phone provisioning is temporarily unavailable. You can add a number later from Settings > Phone." },
      { status: 503 }
    );
  }
}
