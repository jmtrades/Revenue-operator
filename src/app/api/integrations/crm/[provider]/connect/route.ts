/**
 * GET /api/integrations/crm/[provider]/connect â Start OAuth flow for CRM provider.
 * Redirects to OAuth authorization URL if configured, or back to integrations if not.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { createOAuthState } from "@/lib/integrations/oauth-state";
import { randomBytes, createHash } from "crypto";

const ALLOWED_PROVIDERS = ["salesforce", "hubspot", "zoho_crm", "pipedrive", "gohighlevel", "google_contacts", "microsoft_365", "airtable"];

const OAUTH_CONFIG: Record<string, { clientIdEnv: string; redirectUriPath: string; authUrl: (clientId: string, redirectUri: string) => string }> = {
  salesforce: {
    clientIdEnv: "SALESFORCE_CLIENT_ID",
    redirectUriPath: "/api/integrations/crm/salesforce/callback",
    authUrl: (clientId, redirectUri) => `https://login.salesforce.com/services/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=api%20refresh_token`,
  },
  hubspot: {
    clientIdEnv: "HUBSPOT_CLIENT_ID",
    redirectUriPath: "/api/integrations/crm/hubspot/callback",
    authUrl: (clientId, redirectUri) => `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=crm.objects.contacts.write%20crm.objects.contacts.read%20crm.objects.deals.read&response_type=code`,
  },
  zoho_crm: {
    clientIdEnv: "ZOHO_CLIENT_ID",
    redirectUriPath: "/api/integrations/crm/zoho_crm/callback",
    authUrl: (clientId, redirectUri) => `https://accounts.zoho.com/oauth/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=ZohoCRM.modules.ALL`,
  },
  pipedrive: {
    clientIdEnv: "PIPEDRIVE_CLIENT_ID",
    redirectUriPath: "/api/integrations/crm/pipedrive/callback",
    authUrl: (clientId, redirectUri) => `https://oauth.pipedrive.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}`,
  },
  gohighlevel: {
    clientIdEnv: "GOHIGHLEVEL_CLIENT_ID",
    redirectUriPath: "/api/integrations/crm/gohighlevel/callback",
    authUrl: (clientId, redirectUri) => `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=${redirectUri}&client_id=${clientId}&scope=contacts.readonly contacts.write opportunities.readonly opportunities.write`,
  },
  google_contacts: {
    clientIdEnv: "GOOGLE_CLIENT_ID",
    redirectUriPath: "/api/integrations/crm/google_contacts/callback",
    authUrl: (clientId, redirectUri) => `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/contacts&access_type=offline&prompt=consent`,
  },
  microsoft_365: {
    clientIdEnv: "MICROSOFT_CLIENT_ID",
    redirectUriPath: "/api/integrations/crm/microsoft_365/callback",
    authUrl: (clientId, redirectUri) => `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=Contacts.ReadWrite%20Calendars.ReadWrite%20offline_access`,
  },
  airtable: {
    clientIdEnv: "AIRTABLE_CLIENT_ID",
    redirectUriPath: "/api/integrations/crm/airtable/callback",
    authUrl: (clientId, redirectUri) => `https://airtable.com/oauth2/v1/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=data.records:read%20data.records:write%20schema.bases:read&code_challenge_method=S256`,
  },
};

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
  const { provider } = await ctx.params;
  if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
    return NextResponse.redirect(new URL("/app/settings/integrations?crm=invalid", req.url));
  }

  const config = OAUTH_CONFIG[provider];
  if (!config) {
    return NextResponse.redirect(new URL("/app/settings/integrations?crm=invalid", req.url));
  }

  const clientId = process.env[config.clientIdEnv];
  if (!clientId) {
    return NextResponse.redirect(
      new URL(`/app/settings/integrations?crm=config&provider=${provider}`, process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin)
    );
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin).trim();
  const redirectUri = `${appUrl}${config.redirectUriPath}`;
  const state = createOAuthState(session.workspaceId);
  let baseAuthUrl = config.authUrl(clientId, encodeURIComponent(redirectUri));
  let authUrl = `${baseAuthUrl}&state=${encodeURIComponent(state)}`;

  // Airtable requires PKCE (S256 code challenge)
  if (provider === "airtable") {
    const codeVerifier = randomBytes(64).toString("base64url");
    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    authUrl += `&code_challenge=${encodeURIComponent(codeChallenge)}`;
    // Store verifier in a short-lived cookie for the callback
    const res = NextResponse.redirect(authUrl);
    res.cookies.set("airtable_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/api/integrations/crm/airtable/callback",
    });
    return res;
  }

  return NextResponse.redirect(authUrl);
}
