/**
 * POST /api/integrations/crm/[provider]/disconnect — Remove CRM connection for workspace.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const ALLOWED_PROVIDERS = ["salesforce", "hubspot", "zoho_crm", "pipedrive", "gohighlevel", "google_contacts", "microsoft_365"];

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await ctx.params;

  // Validate provider
  if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  try {
    const db = getDb();
    await db
      .from("workspace_crm_connections")
      .delete()
      .eq("workspace_id", session.workspaceId)
      .eq("provider", provider);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[CRM Disconnect] Error disconnecting ${provider}:`, err);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
