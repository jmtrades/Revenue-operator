/**
 * POST /api/integrations/crm/[provider]/disconnect — Remove CRM connection for workspace.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

const ALLOWED_PROVIDERS = ["salesforce", "hubspot", "zoho_crm", "pipedrive", "gohighlevel", "google_contacts", "microsoft_365", "airtable"];

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: max 10 disconnect requests per minute per workspace
  const rl = await checkRateLimit(`crm-disconnect:${session.workspaceId}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  const { provider } = await ctx.params;

  // Validate provider
  if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  try {
    const db = getDb();

    // 1. Delete the connection record
    await db
      .from("workspace_crm_connections")
      .delete()
      .eq("workspace_id", session.workspaceId)
      .eq("provider", provider);

    // 2. Clean up orphaned sync queue jobs for this provider
    await db
      .from("sync_queue")
      .delete()
      .eq("workspace_id", session.workspaceId)
      .eq("provider", provider)
      .in("status", ["pending", "processing"]);

    // 3. Clean up stale field mappings
    await db
      .from("integration_configs")
      .delete()
      .eq("workspace_id", session.workspaceId)
      .eq("provider", provider)
      .eq("config_type", "field_mapping");

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Error disconnecting CRM — details omitted to protect PII
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
