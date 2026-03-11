/**
 * GET /api/integrations/crm/[provider]/connect — Start OAuth flow for CRM provider.
 * Placeholder: redirects back to integrations with message until OAuth is implemented.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";

const ALLOWED_PROVIDERS = ["salesforce", "hubspot", "zoho_crm", "pipedrive", "gohighlevel", "google_contacts", "microsoft_365"];

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
  const base = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  return NextResponse.redirect(
    new URL("/app/settings/integrations?crm=oauth_coming_soon", base)
  );
}
