/**
 * GET /api/workspace/phone — Phone number and status for current workspace.
 * Used by Settings > Phone and empty states to show real number or "Connect number".
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const [{ data: configData }, { data: ws }, { data: firstNumber }] = await Promise.all([
    db
      .from("phone_configs")
      .select("proxy_number, status, outbound_from_number, whatsapp_enabled")
      .eq("workspace_id", session.workspaceId)
      .eq("status", "active")
      .maybeSingle(),
    db.from("workspaces").select("verified_phone").eq("id", session.workspaceId).maybeSingle(),
    db
      .from("phone_numbers")
      .select("phone_number")
      .eq("workspace_id", session.workspaceId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const cfg = configData as {
    proxy_number?: string | null;
    status?: string;
    outbound_from_number?: string | null;
    whatsapp_enabled?: boolean | null;
  } | null;
  const workspace = ws as { verified_phone?: string | null } | null;
  const primaryNumber = cfg?.proxy_number ?? (firstNumber as { phone_number?: string } | null)?.phone_number ?? null;
  return NextResponse.json({
    phone_number: primaryNumber,
    status: cfg?.status ?? (primaryNumber ? "active" : null),
    outbound_from_number: cfg?.outbound_from_number ?? null,
    whatsapp_enabled: cfg?.whatsapp_enabled ?? false,
    verified_phone: workspace?.verified_phone ?? null,
  });
}

/** PATCH: set outbound_from_number and/or whatsapp_enabled (requires active phone_config). */
export async function PATCH(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;


  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErrPatch = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErrPatch) return authErrPatch;

  let body: { outbound_from_number?: string | null; whatsapp_enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const { data: existing } = await db
    .from("phone_configs")
    .select("id")
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "No phone config. Connect a number first." }, { status: 404 });
  }

  const updates: { outbound_from_number?: string | null; whatsapp_enabled?: boolean; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.outbound_from_number === "string") {
    const v = body.outbound_from_number.trim();
    updates.outbound_from_number = v === "" ? null : v;
  }
  if (typeof body.whatsapp_enabled === "boolean") updates.whatsapp_enabled = body.whatsapp_enabled;

  await db.from("phone_configs").update(updates).eq("workspace_id", session.workspaceId);

  return NextResponse.json({ ok: true });
}
