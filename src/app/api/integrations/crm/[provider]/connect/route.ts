/**
 * GET /api/integrations/crm/[provider]/connect — Start OAuth flow for CRM provider.
 * Redirects to OAuth authorization URL if configured, or back to integrations if not.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";

const ALLOWED_PROVIDERS = ["salesforce", "hubspot", "zoho_crm", "pipedrive", "gohighlevel", "google_contacts", "microsoft_365"];

const OAUTH_CONFIG: Record<string, { clientIdEnv: string; redirectUriPath: string; authUrl: (clientId: string, redirectUri: string) => string }> = {
  salesforce: {
    clientIdEnv: "SALESFORCE_CLIENT_ID",
    redirectUriPath: "/api/integrations/crm/salesforce/callback",
    authUrl: (clientId, redirectUri) => `https://login.salesforce.com/services/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=api%20refresh_token`,
  },
  hubspot: {
    clientIdEnv: "HUBSPOT_CLIENT_ID",
    redirectUriPath: "/api/integrations/crm/hubspot/callback",
    authUrl: (clientId, redirectUri) => `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=contacts%20deals&response_type=code`,
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
    authUrl: (clientId, redirectUri) => `https://app.gohighlevel.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`,
  },
  google_contacts: {
    clientIdEnv: "GOOGLE_CLIENT_ID",
    redirectUriPath: "/api/integrations/crm/google_contacts/callback",
    authUrl: (clientId, redirectUri) => `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/contacts.readonly`,
  },
  microsoft_365: {
    clientIdEnv: "MICROSOFT_CLIENT_ID",
    redirectUriPath: "/api/integrations/crm/microsoft_365/callback",
    authUrl: (clientId, redirectUri) => `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=Contacts.Read`,
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
      new URL(`/app/settings/integrations?status=not_configured&provider=${provider}`, process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin)
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const redirectUri = `${appUrl}${config.redirectUriPath}`;
  const authUrl = config.authUrl(clientId, encodeURIComponent(redirectUri));

  return NextResponse.redirect(authUrl);
}
