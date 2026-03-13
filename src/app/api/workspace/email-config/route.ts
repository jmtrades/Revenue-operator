/**
 * GET /api/workspace/email-config — Workspace email config (no API key value).
 * PATCH /api/workspace/email-config — Update provider, from_email, from_name, optional api_key.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { getWorkspaceEmailConfig } from "@/lib/integrations/email";
import { encrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const config = await getWorkspaceEmailConfig(session.workspaceId);
  if (!config) return NextResponse.json({ config: null });
  return NextResponse.json({
    config: {
      provider: config.provider,
      from_email: config.from_email,
      from_name: config.from_name,
      has_api_key: config.has_api_key,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErrPatch = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErrPatch) return authErrPatch;

  let body: { provider?: string; from_email?: string; from_name?: string | null; api_key?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const existing = await getWorkspaceEmailConfig(session.workspaceId);
  const now = new Date().toISOString();
  const provider = (body.provider === "sendgrid" ? "sendgrid" : "resend") as "resend" | "sendgrid";
  const from_email = typeof body.from_email === "string" && body.from_email.trim() ? body.from_email.trim() : undefined;
  const from_name = body.from_name === null || (typeof body.from_name === "string" && body.from_name.trim() === "") ? null : (typeof body.from_name === "string" ? body.from_name.trim() : undefined);

  if (existing) {
    const updates: { provider?: string; from_email?: string; from_name?: string | null; api_key_encrypted?: string; updated_at: string } = { updated_at: now };
    if (body.provider !== undefined) updates.provider = provider;
    if (from_email !== undefined) updates.from_email = from_email;
    if (from_name !== undefined) updates.from_name = from_name;
    if (typeof body.api_key === "string" && body.api_key.trim()) {
      updates.api_key_encrypted = await encrypt(body.api_key.trim());
    }
    const { error } = await db.from("workspace_email_config").update(updates).eq("workspace_id", session.workspaceId);
    if (error) return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  } else {
    if (from_email === undefined) return NextResponse.json({ error: "from_email required for new config" }, { status: 400 });
    const apiKeyEnc = typeof body.api_key === "string" && body.api_key.trim() ? await encrypt(body.api_key.trim()) : null;
    const { error } = await db.from("workspace_email_config").insert({
      workspace_id: session.workspaceId,
      provider,
      api_key_encrypted: apiKeyEnc,
      from_email: from_email,
      from_name: from_name ?? null,
      created_at: now,
      updated_at: now,
    });
    if (error) return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  const config = await getWorkspaceEmailConfig(session.workspaceId);
  return NextResponse.json({
    config: config ? { provider: config.provider, from_email: config.from_email, from_name: config.from_name, has_api_key: config.has_api_key } : null,
  });
}
