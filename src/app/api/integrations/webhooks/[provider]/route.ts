/**
 * POST /api/integrations/webhooks/[provider] — Inbound CRM webhook receiver (Task 19).
 * Verifies request (e.g. shared secret or signature when configured), resolves workspace, enqueues inbound sync.
 * Payload shape is provider-specific; this route enqueues and returns 200 so the provider does not retry.
 */

import { NextRequest, NextResponse } from "next/server";
import { enqueueSync } from "@/lib/integrations/sync-engine";
import type { CrmProviderId } from "@/lib/integrations/field-mapper";
import { assertSameOrigin } from "@/lib/http/csrf";

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
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const { provider } = await ctx.params;
  if (!isAllowed(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  let body: { workspace_id?: string; entity_type?: string; entity_id?: string; [key: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id.trim() : null;
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  // Optional: verify webhook secret when CRM_WEBHOOK_SECRET is set
  const secret = process.env.CRM_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("x-crm-webhook-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const entityType = (body.entity_type ?? "contact") as string;
  const entityId = typeof body.entity_id === "string" ? body.entity_id : undefined;

  await enqueueSync({
    workspaceId,
    provider,
    direction: "inbound",
    entityType: entityType === "lead" ? "lead" : "contact",
    entityId: entityId ?? null,
    payload: body,
  });

  return NextResponse.json({ ok: true });
}
