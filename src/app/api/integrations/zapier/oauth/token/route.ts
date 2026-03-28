/**
 * POST /api/integrations/zapier/oauth/token — Zapier OAuth token exchange (Task 22).
 * Body: code, client_id, client_secret, redirect_uri, grant_type=authorization_code.
 * Returns { access_token } for Zapier to use as Bearer.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // No CSRF check — this is an OAuth token exchange endpoint called by Zapier's servers.
  // Security is enforced via client_secret validation below.

  let body: { code?: string; client_id?: string; client_secret?: string; redirect_uri?: string; grant_type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.grant_type !== "authorization_code" || !body.code?.trim()) {
    return NextResponse.json({ error: "grant_type and code required" }, { status: 400 });
  }

  // Validate client_secret — required for secure token exchange
  const expectedSecret = process.env.ZAPIER_CLIENT_SECRET;
  if (expectedSecret && body.client_secret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid client credentials" }, { status: 401 });
  }

  const db = getDb();
  const { data: row } = await db
    .from("zapier_oauth_codes")
    .select("code, workspace_id, redirect_uri, created_at")
    .eq("code", body.code.trim())
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

  // Enforce 10-minute code expiry
  const codeCreatedAt = (row as { created_at?: string }).created_at;
  if (codeCreatedAt && Date.now() - new Date(codeCreatedAt).getTime() > 10 * 60 * 1000) {
    await db.from("zapier_oauth_codes").delete().eq("code", body.code.trim());
    return NextResponse.json({ error: "Code expired" }, { status: 400 });
  }

  const r = row as { workspace_id: string; redirect_uri?: string | null };
  if (body.redirect_uri && r.redirect_uri && body.redirect_uri !== r.redirect_uri) {
    return NextResponse.json({ error: "redirect_uri mismatch" }, { status: 400 });
  }

  const accessToken = `zapier_${randomBytes(32).toString("hex")}`;
  await db.from("zapier_connections").insert({
    workspace_id: r.workspace_id,
    access_token: accessToken,
  });
  await db.from("zapier_oauth_codes").delete().eq("code", body.code.trim());

  return NextResponse.json({
    access_token: accessToken,
    token_type: "bearer",
  });
}
