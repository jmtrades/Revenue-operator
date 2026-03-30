/**
 * Zoom OAuth connect: redirect to Zoom authorization
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { createOAuthState } from "@/lib/integrations/oauth-state";

const ZOOM_AUTH_URL = "https://zoom.us/oauth/authorize";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  const returnTo = req.nextUrl.searchParams.get("return_to") || "activation";
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const clientId = process.env.ZOOM_CLIENT_ID;
  const baseUrl = process.env.BASE_URL || req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    console.error("[zoom/connect] Cannot determine base URL");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }
  const redirectUri = `${baseUrl}/api/integrations/zoom/callback`;

  if (!clientId) {
    return NextResponse.json(
      {
        error: "Zoom integration not configured",
        detail:
          "The Zoom OAuth application has not been set up for this workspace. " +
          "A workspace administrator must create a Zoom OAuth app in the Zoom Marketplace " +
          "and add the ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET environment variables.",
        impact: "Zoom meeting links will not be auto-created for appointments. All other features continue to work normally.",
        action: "Contact your workspace administrator to complete the Zoom OAuth setup.",
      },
      { status: 503 }
    );
  }

  const state = createOAuthState(workspaceId, { returnTo });
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(`${ZOOM_AUTH_URL}?${params.toString()}`);
}
