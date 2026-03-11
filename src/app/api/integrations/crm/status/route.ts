/**
 * GET /api/integrations/crm/status — CRM integration connection and sync status for current workspace.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const CRM_PROVIDERS = [
  "salesforce",
  "hubspot",
  "zoho_crm",
  "pipedrive",
  "gohighlevel",
  "google_contacts",
  "microsoft_365",
] as const;

export type CrmProviderId = (typeof CRM_PROVIDERS)[number];

export interface CrmIntegrationStatus {
  connected: boolean;
  lastSyncAt: string | null;
  recordsSynced: number;
  errorCount: number;
}

export type CrmStatusResponse = {
  integrations: Record<CrmProviderId, CrmIntegrationStatus>;
  global: {
    lastSyncAt: string | null;
    recordsSynced: number;
    errors: number;
  };
};

function emptyStatus(): CrmIntegrationStatus {
  return { connected: false, lastSyncAt: null, recordsSynced: 0, errorCount: 0 };
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    const integrations = Object.fromEntries(
      CRM_PROVIDERS.map((p) => [p, emptyStatus()])
    ) as Record<CrmProviderId, CrmIntegrationStatus>;
    return NextResponse.json({
      integrations,
      global: { lastSyncAt: null, recordsSynced: 0, errors: 0 },
    } satisfies CrmStatusResponse);
  }

  const db = getDb();
  const { data: rows, error } = await db
    .from("workspace_crm_connections")
    .select("provider, connected_at, last_sync_at, records_synced, sync_errors")
    .eq("workspace_id", session.workspaceId)
    .in("provider", [...CRM_PROVIDERS]);

  if (error) {
    const integrations = Object.fromEntries(
      CRM_PROVIDERS.map((p) => [p, emptyStatus()])
    ) as Record<CrmProviderId, CrmIntegrationStatus>;
    return NextResponse.json({
      integrations,
      global: { lastSyncAt: null, recordsSynced: 0, errors: 0 },
    } satisfies CrmStatusResponse);
  }

  const byProvider = new Map(
    (rows ?? []).map((r: { provider: string; connected_at?: string | null; last_sync_at?: string | null; records_synced?: number; sync_errors?: number }) => [
      r.provider,
      {
        connected: Boolean(r.connected_at),
        lastSyncAt: r.last_sync_at ?? null,
        recordsSynced: r.records_synced ?? 0,
        errorCount: r.sync_errors ?? 0,
      },
    ])
  );

  const integrations = Object.fromEntries(
    CRM_PROVIDERS.map((p) => [p, byProvider.get(p) ?? emptyStatus()])
  ) as Record<CrmProviderId, CrmIntegrationStatus>;

  let globalLastSync: string | null = null;
  let globalRecords = 0;
  let globalErrors = 0;
  for (const s of Object.values(integrations)) {
    globalRecords += s.recordsSynced;
    globalErrors += s.errorCount;
    if (s.lastSyncAt && (!globalLastSync || s.lastSyncAt > globalLastSync)) {
      globalLastSync = s.lastSyncAt;
    }
  }

  return NextResponse.json({
    integrations,
    global: { lastSyncAt: globalLastSync, recordsSynced: globalRecords, errors: globalErrors },
  } satisfies CrmStatusResponse);
}
