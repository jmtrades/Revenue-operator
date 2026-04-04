/**
 * Zoom OAuth callback: exchange code for tokens, store encrypted
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { encrypt } from "@/lib/encryption";
import { verifyOAuthState } from "@/lib/integrations/oauth-state";
import { log } from "@/lib/logger";

const ZOOM_TOKEN_URL = "https://zoom.us/oauth/token";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/activation?error=zoom_callback_missing", req.url));
  }

  const verifiedWorkspaceId = verifyOAuthState(state);
  if (!verifiedWorkspaceId) {
    return NextResponse.redirect(new URL("/dashboard/activation?error=zoom_invalid_state", req.url));
  }
  const workspaceId = verifiedWorkspaceId;

  // Extract returnTo from signed payload (best-effort)
  let returnTo = "activation";
  try {
    const dotIdx = state.lastIndexOf(".");
    const payloadStr = dotIdx > 0 ? state.slice(0, dotIdx) : state;
    const parsed = JSON.parse(Buffer.from(payloadStr, "base64url").toString());
    returnTo = parsed.returnTo ?? "activation";
  } catch {
    // Use default returnTo
  }

  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || "";
  const redirectUri = `${baseUrl}/api/integrations/zoom/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/dashboard/activation?error=zoom_not_configured", req.url));
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(ZOOM_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    await res.text();
    // Token error; redirect below
    return NextResponse.redirect(new URL("/dashboard/activation?error=zoom_token_failed", req.url));
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user?: { id?: string };
  };

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in ?? 3600));
  const zoomUserId = data.user?.id ?? "unknown";

  try {
    const accessEnc = await encrypt(data.access_token);
    const refreshEnc = await encrypt(data.refresh_token);

    const db = getDb();
    await db.from("zoom_accounts").upsert(
      {
        workspace_id: workspaceId,
        zoom_user_id: zoomUserId,
        access_token_enc: accessEnc,
        refresh_token_enc: refreshEnc,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );

    await db.from("activation_states").upsert(
      {
        workspace_id: workspaceId,
        zoom_connected: true,
        step: "activated",
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );

    await db.from("settings").update({ call_aware_enabled: true }).eq("workspace_id", workspaceId);

    // Synthetic protection bootstrap removed - only show real activity

    const { sendActivationConfirmationEmail } = await import("@/lib/email/activation");
    sendActivationConfirmationEmail(workspaceId).catch((err) => { log("error", "[integrations/zoom/callback] error:", { error: err instanceof Error ? err.message : err }); });
  } catch (_err) {
    // Store error; redirect below
    return NextResponse.redirect(new URL("/dashboard/activation?error=zoom_store_failed", req.url));
  }

  const base = returnTo === "onboarding" ? "/dashboard/live" : "/dashboard/activation";
  return NextResponse.redirect(new URL(`${base}?zoom_connected=1`, req.url));
}
