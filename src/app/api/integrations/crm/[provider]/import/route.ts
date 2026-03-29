/**
 * POST /api/integrations/crm/[provider]/import — Pull contacts FROM a CRM into Revenue Operator.
 * Fetches contacts from the CRM API and enqueues inbound sync jobs to create/update leads.
 * Rate-limited to prevent abuse.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { getValidTokens } from "@/lib/integrations/token-refresh";
import { enqueueSync } from "@/lib/integrations/sync-engine";
import { checkRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import type { CrmProviderId } from "@/lib/integrations/field-mapper";
import { assertSameOrigin } from "@/lib/http/csrf";

const ALLOWED: CrmProviderId[] = [
  "hubspot",
  "salesforce",
  "zoho_crm",
  "pipedrive",
  "gohighlevel",
  "google_contacts",
  "microsoft_365",
  "airtable",
];

function isAllowed(s: string): s is CrmProviderId {
  return ALLOWED.includes(s as CrmProviderId);
}

/** Fetch contacts from a CRM provider API. Returns an array of raw contact objects. */
async function fetchCrmContacts(
  provider: CrmProviderId,
  tokens: { access_token: string; instance_url: string | null },
  limit: number,
  workspaceId: string
): Promise<Record<string, unknown>[]> {
  const headers = { Authorization: `Bearer ${tokens.access_token}`, "Content-Type": "application/json" };
  const signal = AbortSignal.timeout(30_000);

  switch (provider) {
    case "hubspot": {
      const res = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts?limit=${Math.min(limit, 100)}&properties=email,phone,firstname,lastname,company,lifecyclestage,lead_status`,
        { headers, signal }
      );
      if (!res.ok) throw new Error(`HubSpot API error: ${res.status}`);
      const data = await res.json();
      return (data.results ?? []).map((r: { properties: Record<string, unknown> }) => ({
        ...r.properties,
        _hubspot_id: (r as Record<string, unknown>).id,
      }));
    }

    case "salesforce": {
      const base = tokens.instance_url ?? "https://login.salesforce.com";
      const res = await fetch(
        `${base}/services/data/v59.0/query?q=${encodeURIComponent(`SELECT Id,FirstName,LastName,Email,Phone,Company,Status FROM Lead ORDER BY CreatedDate DESC LIMIT ${limit}`)}`,
        { headers, signal }
      );
      if (!res.ok) throw new Error(`Salesforce API error: ${res.status}`);
      const data = await res.json();
      return data.records ?? [];
    }

    case "zoho_crm": {
      const res = await fetch(
        `https://www.zohoapis.com/crm/v2/Leads?per_page=${Math.min(limit, 200)}&sort_by=Created_Time&sort_order=desc`,
        { headers, signal }
      );
      if (!res.ok) throw new Error(`Zoho API error: ${res.status}`);
      const data = await res.json();
      return data.data ?? [];
    }

    case "pipedrive": {
      const res = await fetch(
        `https://api.pipedrive.com/v1/persons?limit=${Math.min(limit, 100)}&sort=add_time DESC`,
        { headers, signal }
      );
      if (!res.ok) throw new Error(`Pipedrive API error: ${res.status}`);
      const data = await res.json();
      return data.data ?? [];
    }

    case "gohighlevel": {
      const res = await fetch(
        `https://services.leadconnectorhq.com/contacts/?limit=${Math.min(limit, 100)}&sortBy=dateAdded&sortOrder=desc`,
        { headers, signal }
      );
      if (!res.ok) throw new Error(`GoHighLevel API error: ${res.status}`);
      const data = await res.json();
      return data.contacts ?? [];
    }

    case "google_contacts": {
      const res = await fetch(
        `https://people.googleapis.com/v1/people/me/connections?pageSize=${Math.min(limit, 100)}&personFields=names,emailAddresses,phoneNumbers,organizations&sortOrder=LAST_MODIFIED_DESCENDING`,
        { headers, signal }
      );
      if (!res.ok) throw new Error(`Google Contacts API error: ${res.status}`);
      const data = await res.json();
      return data.connections ?? [];
    }

    case "microsoft_365": {
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/contacts?$top=${Math.min(limit, 100)}&$orderby=lastModifiedDateTime desc&$select=givenName,surname,emailAddresses,mobilePhone,companyName`,
        { headers, signal }
      );
      if (!res.ok) throw new Error(`Microsoft 365 API error: ${res.status}`);
      const data = await res.json();
      return data.value ?? [];
    }

    case "airtable": {
      // Airtable needs base ID and table name from workspace connection metadata
      const db = getDb();
      const { data: cfg } = await db
        .from("workspace_crm_connections")
        .select("metadata, instance_url")
        .eq("workspace_id", workspaceId)
        .eq("provider", "airtable")
        .maybeSingle();
      const meta = (cfg as { metadata?: { base_id?: string; table_name?: string } | null; instance_url?: string | null } | null);
      const baseId = meta?.metadata?.base_id ?? meta?.instance_url;
      const tableName = meta?.metadata?.table_name ?? "Contacts";
      if (!baseId) throw new Error("Airtable base ID not configured. Please set your base ID in integration settings.");

      const res = await fetch(
        `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?maxRecords=${Math.min(limit, 100)}&sort%5B0%5D%5Bfield%5D=Created&sort%5B0%5D%5Bdirection%5D=desc`,
        { headers, signal }
      );
      if (!res.ok) throw new Error(`Airtable API error: ${res.status}`);
      const data = await res.json();
      return (data.records ?? []).map((r: { fields: Record<string, unknown> }) => r.fields);
    }

    default:
      return [];
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

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

  // Rate limit: 3 imports per hour per workspace
  const rl = await checkRateLimit(`crm-import:${session.workspaceId}`, 3, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Import rate limit reached. Try again in an hour." },
      { status: 429 }
    );
  }

  // Get OAuth tokens
  let tokens;
  try {
    tokens = await getValidTokens(session.workspaceId, provider);
  } catch (err) {
    return NextResponse.json(
      { error: `Not connected to ${provider}. Please connect first.` },
      { status: 400 }
    );
  }
  if (!tokens?.access_token) {
    return NextResponse.json(
      { error: `Not connected to ${provider}. Please connect first.` },
      { status: 400 }
    );
  }

  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10) || 100,
    500
  );

  try {
    const contacts = await fetchCrmContacts(provider, tokens, limit, session.workspaceId);

    if (contacts.length === 0) {
      return NextResponse.json({ imported: 0, message: "No contacts found in CRM." });
    }

    // Enqueue inbound sync jobs for each contact
    let enqueued = 0;
    for (const contact of contacts) {
      try {
        await enqueueSync({
          workspaceId: session.workspaceId,
          provider,
          direction: "inbound",
          entityType: "contact",
          entityId: undefined,
          payload: contact,
        });
        enqueued++;
      } catch {
        // Skip individual failures
      }
    }

    log("info", "crm_import.completed", {
      provider,
      workspaceId: session.workspaceId,
      fetched: contacts.length,
      enqueued,
    });

    // Update connection stats
    const db = getDb();
    await db
      .from("workspace_crm_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", session.workspaceId)
      .eq("provider", provider);

    return NextResponse.json({
      imported: enqueued,
      total_found: contacts.length,
      message: `${enqueued} contacts queued for import from ${provider}.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", "crm_import.failed", { provider, error: msg });
    return NextResponse.json(
      { error: `Failed to import from ${provider}. Please check your connection and try again.` },
      { status: 500 }
    );
  }
}
