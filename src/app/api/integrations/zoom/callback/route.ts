/**
 * Zoom OAuth callback: exchange code for tokens, store encrypted
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { encrypt } from "@/lib/encryption";

const ZOOM_TOKEN_URL = "https://zoom.us/oauth/token";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/activation?error=zoom_callback_missing", req.url));
  }

  let workspaceId: string;
  let returnTo = "activation";
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString());
    workspaceId = parsed.workspaceId;
    returnTo = parsed.returnTo ?? "activation";
  } catch {
    return NextResponse.redirect(new URL("/dashboard/activation?error=zoom_invalid_state", req.url));
  }

  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const baseUrl = process.env.BASE_URL || req.nextUrl.origin || "http://localhost:3000";
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
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[zoom callback] token error", err);
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

    const { runSyntheticProtectionBootstrap } = await import("@/lib/bootstrap/synthetic-protection");
    await runSyntheticProtectionBootstrap(workspaceId);

    const { sendActivationConfirmationEmail } = await import("@/lib/email/activation");
    sendActivationConfirmationEmail(workspaceId).catch(() => {});
  } catch (err) {
    console.error("[zoom callback] store error", err);
    return NextResponse.redirect(new URL("/dashboard/activation?error=zoom_store_failed", req.url));
  }

  const base = returnTo === "onboarding" ? "/dashboard" : "/dashboard/activation";
  return NextResponse.redirect(new URL(`${base}?zoom_connected=1&workspace_id=${workspaceId}`, req.url));
}
