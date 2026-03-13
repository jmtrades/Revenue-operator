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

  const redirectUri = req.nextUrl.searchParams.get("redirect_uri");
  const state = req.nextUrl.searchParams.get("state");
  if (!redirectUri) return NextResponse.json({ error: "redirect_uri required" }, { status: 400 });

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
