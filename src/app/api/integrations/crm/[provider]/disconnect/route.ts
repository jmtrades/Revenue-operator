/**
 * POST /api/integrations/crm/[provider]/disconnect — Remove CRM connection for workspace.
 *
 * Phase 78 / Phase 5 (P0-11 Data, GDPR/CCPA): before deleting the local
 * connection row, we call the provider's revoke endpoint to invalidate the
 * token upstream. Deleting locally without revoking leaves a valid token
 * in any backup/log that held a copy. `revokeProviderToken` is fail-soft
 * (it logs but never throws) so an upstream outage can't strand the user
 * in a half-disconnected state.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";
import {
  revokeProviderToken,
  type RevokeProvider,
} from "@/lib/security/oauth-revoke";

export const dynamic = "force-dynamic";

const ALLOWED_PROVIDERS = ["salesforce", "hubspot", "zoho_crm", "pipedrive", "gohighlevel", "google_contacts", "microsoft_365", "airtable"];

/** Map the URL-slug provider to the revoke-helper's provider key. */
const REVOKE_PROVIDER_MAP: Record<string, RevokeProvider | undefined> = {
  salesforce: "salesforce",
  hubspot: "hubspot",
  zoho_crm: "zoho_crm",
  google_contacts: "google_contacts",
  microsoft_365: "microsoft_365",
  // pipedrive / gohighlevel / airtable: no documented standalone revoke
  // endpoint — omitted (we still delete the local row).
};

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

    // Phase 78/Phase 5: revoke upstream BEFORE local delete. Fetch the token
    // from the row we're about to delete; pass it to `revokeProviderToken`,
    // which is fail-soft. If the provider has no documented revoke flow
    // (pipedrive/gohighlevel/airtable) we skip it and proceed to delete.
    const { data: conn } = await db
      .from("workspace_crm_connections")
      .select("access_token, refresh_token")
      .eq("workspace_id", session.workspaceId)
      .eq("provider", provider)
      .maybeSingle();
    const revokeKey = REVOKE_PROVIDER_MAP[provider];
    if (revokeKey) {
      const connRow = conn as {
        access_token?: string | null;
        refresh_token?: string | null;
      } | null;
      // Prefer refresh_token for revoke — revoking it also invalidates
      // derived access tokens per RFC 7009.
      const tokenToRevoke =
        connRow?.refresh_token ?? connRow?.access_token ?? "";
      await revokeProviderToken(revokeKey, tokenToRevoke);
    }

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
