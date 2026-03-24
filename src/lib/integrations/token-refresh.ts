/**
 * OAuth token refresh logic for CRM integrations.
 * Automatically refreshes expired access tokens using stored refresh tokens.
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import type { CrmProviderId } from "./field-mapper";

export interface CrmTokens {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  instance_url: string | null;
}

const TOKEN_URLS: Record<CrmProviderId, string> = {
  hubspot: "https://api.hubapi.com/oauth/v1/token",
  salesforce: "https://login.salesforce.com/services/oauth2/token",
  zoho_crm: "https://accounts.zoho.com/oauth/v2/token",
  pipedrive: "https://oauth.pipedrive.com/oauth/token",
  gohighlevel: "https://services.leadconnectorhq.com/oauth/token",
  google_contacts: "https://oauth2.googleapis.com/token",
  microsoft_365: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  airtable: "https://airtable.com/oauth2/v1/token",
};

const ENV_PREFIX: Record<CrmProviderId, string> = {
  hubspot: "HUBSPOT",
  salesforce: "SALESFORCE",
  zoho_crm: "ZOHO",
  pipedrive: "PIPEDRIVE",
  gohighlevel: "GOHIGHLEVEL",
  google_contacts: "GOOGLE",
  microsoft_365: "MICROSOFT",
  airtable: "AIRTABLE",
};

/**
 * Get valid tokens for a CRM provider. Refreshes if expired.
 * Returns null if no connection exists or refresh fails.
 */
export async function getValidTokens(
  workspaceId: string,
  provider: CrmProviderId
): Promise<CrmTokens | null> {
  const db = getDb();
  const { data: conn } = await db
    .from("workspace_crm_connections")
    .select("access_token, refresh_token, token_expires_at, instance_url")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .eq("status", "active")
    .maybeSingle();

  if (!conn || !conn.access_token) return null;

  const row = conn as { access_token: string; refresh_token: string | null; token_expires_at: string | null; instance_url: string | null };
  const tokens: CrmTokens = {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expires_at: row.token_expires_at,
    instance_url: row.instance_url,
  };

  // Check if token is expired (with 5-minute buffer)
  if (tokens.expires_at) {
    const expiresAt = new Date(tokens.expires_at).getTime();
    const now = Date.now();
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    if (now >= expiresAt - bufferMs) {
      // Token is expired or about to expire — refresh it
      if (!tokens.refresh_token) {
        log("warn", "crm_token.no_refresh_token", { provider, workspaceId });
        return null;
      }
      return refreshTokens(workspaceId, provider, tokens.refresh_token);
    }
  }

  return tokens;
}

/**
 * Refresh an OAuth access token using the refresh token.
 */
async function refreshTokens(
  workspaceId: string,
  provider: CrmProviderId,
  refreshToken: string
): Promise<CrmTokens | null> {
  const prefix = ENV_PREFIX[provider];
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  const tokenUrl = TOKEN_URLS[provider];

  if (!clientId || !clientSecret || !tokenUrl) {
    log("error", "crm_token.missing_credentials", { provider });
    return null;
  }

  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      log("error", "crm_token.refresh_failed", {
        provider,
        status: res.status,
        error: errText.slice(0, 200),
      });
      return null;
    }

    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      instance_url?: string;
    };

    if (!data.access_token) {
      log("error", "crm_token.no_access_token_in_refresh", { provider });
      return null;
    }

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

    // Update tokens in database
    const db = getDb();
    await db
      .from("workspace_crm_connections")
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? refreshToken, // Some providers rotate refresh tokens
        token_expires_at: expiresAt,
        instance_url: data.instance_url ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("provider", provider);

    log("info", "crm_token.refreshed", { provider, workspaceId });

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? refreshToken,
      expires_at: expiresAt,
      instance_url: data.instance_url ?? null,
    };
  } catch (err) {
    log("error", "crm_token.refresh_error", {
      provider,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
