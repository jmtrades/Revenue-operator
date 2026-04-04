/**
 * GET /api/integrations/crm/status â CRM integration connection and sync status for current workspace.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
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
  "airtable",
] as const;

export type CrmProviderId = (typeof CRM_PROVIDERS)[number];

export interface CrmIntegrationStatus {
  connected: boolean;
  lastSyncAt: string | null;
  recordsSynced: number;
  errorCount: number;
  tokenStatus?: 'valid' | 'expired' | 'expiring_soon' | 'error';
  tokenError?: string | null;
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

  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  // workspace_crm_connections has: provider, status, updated_at, token_expires_at, token_error, metadata
  const { data: rows, error } = await db
    .from("workspace_crm_connections")
    .select("provider, status, updated_at, token_expires_at, token_error, refresh_token")
    .eq("workspace_id", session.workspaceId)
    .in("provider", [...CRM_PROVIDERS]);

  if (error) {
    log("error", "[CRM Status] Failed to query workspace_crm_connections", { error: error.message, code: error.code });
    const integrations = Object.fromEntries(
      CRM_PROVIDERS.map((p) => [p, emptyStatus()])
    ) as Record<CrmProviderId, CrmIntegrationStatus>;
    return NextResponse.json({
      integrations,
      global: { lastSyncAt: null, recordsSynced: 0, errors: 0 },
    } satisfies CrmStatusResponse);
  }

  // Derive sync stats from sync_log table
  const { data: syncStats } = await db
    .from("sync_log")
    .select("provider, action, created_at")
    .eq("workspace_id", session.workspaceId)
    .in("provider", [...CRM_PROVIDERS])
    .order("created_at", { ascending: false })
    .limit(500);

  const syncStatsByProvider = new Map<string, { recordsSynced: number; errorCount: number; lastSyncAt: string | null }>();
  for (const s of (syncStats ?? []) as Array<{ provider: string; action: string; created_at: string }>) {
    const existing = syncStatsByProvider.get(s.provider) ?? { recordsSynced: 0, errorCount: 0, lastSyncAt: null };
    if (s.action === "created" || s.action === "updated") existing.recordsSynced += 1;
    if (s.action === "failed") existing.errorCount += 1;
    if (!existing.lastSyncAt || s.created_at > existing.lastSyncAt) existing.lastSyncAt = s.created_at;
    syncStatsByProvider.set(s.provider, existing);
  }

  const byProvider = new Map(
    (rows ?? []).map((r: { provider: string; status?: string | null; updated_at?: string | null; token_expires_at?: string | null; token_error?: string | null; refresh_token?: string | null }) => {
      const stats = syncStatsByProvider.get(r.provider);

      // Determine token status
      let tokenStatus: 'valid' | 'expired' | 'expiring_soon' | 'error' = 'valid';
      if (r.token_error) {
        tokenStatus = 'error';
      } else if (r.status === 'active' && r.token_expires_at) {
        const expiresAt = new Date(r.token_expires_at).getTime();
        const now = Date.now();
        const oneHourMs = 60 * 60 * 1000;

        if (now >= expiresAt) {
          // Token is expired
          if (!r.refresh_token) {
            tokenStatus = 'expired';
          } else {
            // Token is expired but we have a refresh token, so it may still be recoverable
            tokenStatus = 'expired';
          }
        } else if (now >= expiresAt - oneHourMs) {
          // Token expires within the next hour
          tokenStatus = 'expiring_soon';
        }
      }

      return [
        r.provider,
        {
          connected: r.status === "active" && tokenStatus !== 'expired',
          lastSyncAt: stats?.lastSyncAt ?? r.updated_at ?? null,
          recordsSynced: stats?.recordsSynced ?? 0,
          errorCount: stats?.errorCount ?? 0,
          tokenStatus,
          tokenError: r.token_error ?? null,
        },
      ];
    })
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
import { log } from "@/lib/logger";
