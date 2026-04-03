/**
 * GET /api/integrations/zapier/oauth/authorize — Zapier OAuth authorize (Task 22).
 * Query: redirect_uri, state, client_id. User must be logged in (session). Redirects to Zapier with code.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    const loginUrl = `/sign-in?redirect=${encodeURIComponent(req.nextUrl.pathname + "?" + req.nextUrl.searchParams.toString())}`;
    return NextResponse.redirect(loginUrl);
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  // API access is a premium feature
  const { canUseFeature } = await import("@/lib/billing/plan-enforcement");
  const gate = await canUseFeature(session.workspaceId, "apiAccess");
  if (!gate.allowed) {
    return NextResponse.json({
      error: gate.message ?? "API integrations require a higher plan.",
      upgradeTo: gate.upgradeTo,
    }, { status: 403 });
  }

  const redirectUri = req.nextUrl.searchParams.get("redirect_uri");
  const state = req.nextUrl.searchParams.get("state");
  if (!redirectUri) return NextResponse.json({ error: "redirect_uri required" }, { status: 400 });

  // Validate redirect_uri to prevent open redirect attacks
  const ALLOWED_REDIRECT_HOSTS = ["zapier.com", "hooks.zapier.com", "nla.zapier.com"];
  try {
    const parsed = new URL(redirectUri);
    if (parsed.protocol !== "https:" || !ALLOWED_REDIRECT_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))) {
      return NextResponse.json({ error: "Invalid redirect_uri: must be a Zapier URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid redirect_uri format" }, { status: 400 });
  }

  const code = randomBytes(24).toString("hex");
  const db = getDb();
  await db.from("zapier_oauth_codes").insert({
    code,
    workspace_id: session.workspaceId,
    redirect_uri: redirectUri,
  });

  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  return NextResponse.redirect(url.toString());
}
