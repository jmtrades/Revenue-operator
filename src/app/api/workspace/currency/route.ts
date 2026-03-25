/**
 * GET /api/workspace/currency — Get workspace currency preference.
 * PATCH /api/workspace/currency — Update workspace currency.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/http/csrf";

const PATCH_BODY = z.object({
  currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "BRL", "MXN"]),
});

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = session.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ currency: "USD" });
  }
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data, error } = await db
    .from("workspaces")
    .select("currency")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const currency = (data as { currency?: string } | null)?.currency ?? "USD";
  return NextResponse.json({ currency });
}

export async function PATCH(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaceId = session.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 400 });
  }
  const authErrPatch = await requireWorkspaceAccess(req, workspaceId);
  if (authErrPatch) return authErrPatch;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PATCH_BODY.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }
  const db = getDb();
  const { error } = await db
    .from("workspaces")
    .update({ currency: parsed.data.currency, updated_at: new Date().toISOString() })
    .eq("id", workspaceId)
    .eq("owner_id", session.userId);
  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ currency: parsed.data.currency });
}
