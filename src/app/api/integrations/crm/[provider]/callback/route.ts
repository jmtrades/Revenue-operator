/**
 * GET /api/integrations/crm/[provider]/callback â OAuth callback for CRM providers.
 * Exchanges authorization code for access_token + refresh_token, stores in workspace_crm_connections, redirects.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { verifyOAuthState } from "@/lib/integrations/oauth-state";

export const dynamic = "force-dynamic";

const OAUTH_TOKEN_URLS: Record<string, string> = {
  hubspot: "https://api.hubapi.com/oauth/v1/token",
  salesforce: "https://login.salesforce.com/services/oauth2/token",
  zoho_crm: "https://accounts.zoho.com/oauth/v2/token",
  pipedrive: "https://oauth.pipedrive.com/oauth/token",
  gohighlevel: "https://services.leadconnectorhq.com/oauth/token",
  google_contacts: "https://oauth2.googleapis.com/token",
  microsoft_365: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  airtable: "https://airtable.com/oauth2/v1/token",
};

// No provider aliases — redirect URIs now correctly use "gohighlevel"
const PROVIDER_ALIAS: Record<string, string> = {};

const ALLOWED_PROVIDERS = Object.keys(OAUTH_TOKEN_URLS);

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const code = req.nextUrl.searchParams.get("code");
  const rawState = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin).trim();
  const returnUrl = `${origin}/app/settings/integrations`;

  const { provider: rawProvider } = await ctx.params;

  // Validate provider
  if (!rawProvider || !ALLOWED_PROVIDERS.includes(rawProvider)) {
    return NextResponse.redirect(`${returnUrl}?crm=invalid`);
  }

  // Resolve alias (e.g. "leadconnector" → "gohighlevel")
  const provider = PROVIDER_ALIAS[rawProvider] ?? rawProvider;

  // Handle OAuth errors
  if (error || !code) {
    return NextResponse.redirect(`${returnUrl}?crm=error&provider=${provider}`);
  }

  if (!rawState) {
    return NextResponse.redirect(`${returnUrl}?crm=error&provider=${provider}`);
  }

  // Verify HMAC-signed state to prevent CSRF
  const workspaceId = verifyOAuthState(rawState);
  if (!workspaceId) {
    return NextResponse.redirect(
      `${returnUrl}?crm=error&provider=${provider}&reason=invalid_state`
    );
  }

  // Get OAuth credentials with proper env var mapping
  const ENV_PREFIX: Record<string, string> = {
    hubspot: "HUBSPOT",
    salesforce: "SALESFORCE",
    zoho_crm: "ZOHO",
    pipedrive: "PIPEDRIVE",
    gohighlevel: "GOHIGHLEVEL",
    google_contacts: "GOOGLE",
    microsoft_365: "MICROSOFT",
    airtable: "AIRTABLE",
  };
  const prefix = ENV_PREFIX[provider] ?? provider.toUpperCase();
  const clientIdEnv = `${prefix}_CLIENT_ID`;
  const clientSecretEnv = `${prefix}_CLIENT_SECRET`;

  const clientId = process.env[clientIdEnv];
  const clientSecret = process.env[clientSecretEnv];

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${returnUrl}?crm=config&provider=${provider}`
    );
  }

  // Determine redirect URI — use rawProvider (URL path) so it matches what GHL was configured with
  const callbackPath = `/api/integrations/crm/${rawProvider}/callback`;
  const redirectUri = `${origin}${callbackPath}`;

  const tokenUrl = OAUTH_TOKEN_URLS[provider];
  if (!tokenUrl) {
    return NextResponse.redirect(`${returnUrl}?crm=invalid&provider=${provider}`);
  }

  // Exchange code for tokens
  try {
    const body = new URLSearchParams();
    body.append("code", code);
    body.append("redirect_uri", redirectUri);
    body.append("grant_type", "authorization_code");

    // Airtable uses HTTP Basic auth and requires PKCE code_verifier
    const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
    if (provider === "airtable") {
      headers["Authorization"] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
      const codeVerifier = req.cookies.get("airtable_code_verifier")?.value;
      if (codeVerifier) {
        body.append("code_verifier", codeVerifier);
      }
    } else {
      body.append("client_id", clientId);
      body.append("client_secret", clientSecret);
    }

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers,
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error(`[CRM Callback] Token exchange failed for ${provider}: ${tokenRes.status}`, errText);
      return NextResponse.redirect(
        `${returnUrl}?crm=error&provider=${provider}&reason=token_exchange_failed`
      );
    }

    const tokens = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      instance_url?: string; // Salesforce returns this
    };

    if (!tokens.access_token) {
      return NextResponse.redirect(
        `${returnUrl}?crm=error&provider=${provider}&reason=no_access_token`
      );
    }

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Store tokens and mark as connected
    const db = getDb();
    const { error: upsertErr } = await db
      .from("workspace_crm_connections")
      .upsert(
        {
          workspace_id: workspaceId,
          provider,
          status: "active",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          token_expires_at: expiresAt,
          instance_url: tokens.instance_url ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,provider" }
      );

    if (upsertErr) {
      console.error(`[CRM Callback] Database upsert failed for ${provider}:`, upsertErr);
      return NextResponse.redirect(
        `${returnUrl}?crm=error&provider=${provider}&reason=db_error`
      );
    }

    return NextResponse.redirect(`${returnUrl}?crm=connected&provider=${provider}`);
  } catch (err) {
    console.error(`[CRM Callback] Unexpected error for ${provider}:`, err);
    return NextResponse.redirect(
      `${returnUrl}?crm=error&provider=${provider}&reason=server_error`
    );
  }
}
