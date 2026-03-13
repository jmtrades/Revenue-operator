/**
 * POST /api/integrations/crm/[provider]/batch-sync — Enqueue outbound sync for workspace leads (Task 19).
 * Paginates leads and enqueues one job per lead for the given provider. Rate-limited by page size.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { enqueueBatchOutbound } from "@/lib/integrations/sync-engine";
import type { CrmProviderId } from "@/lib/integrations/field-mapper";

const ALLOWED: CrmProviderId[] = [
  "salesforce",
  "hubspot",
  "zoho_crm",
  "pipedrive",
  "gohighlevel",
  "google_contacts",
  "microsoft_365",
];

export const dynamic = "force-dynamic";

function isAllowed(s: string): s is CrmProviderId {
  return ALLOWED.includes(s as CrmProviderId);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const { provider } = await ctx.params;
  if (!isAllowed(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10) || 100, 500);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10) || 0;

  const db = getDb();
  const { data: rows } = await db
    .from("leads")
    .select("id")
    .eq("workspace_id", session.workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const leadIds = (rows ?? []).map((r: { id: string }) => r.id);
  const { enqueued } = await enqueueBatchOutbound({
    workspaceId: session.workspaceId,
    provider,
    leadIds,
  });

  return NextResponse.json({ enqueued, page_size: leadIds.length });
}
