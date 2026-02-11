/**
 * Zoom OAuth connect: redirect to Zoom authorization
 */

import { NextRequest, NextResponse } from "next/server";

const ZOOM_AUTH_URL = "https://zoom.us/oauth/authorize";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const clientId = process.env.ZOOM_CLIENT_ID;
  const baseUrl = process.env.BASE_URL || (req.nextUrl.origin || "http://localhost:3000");
  const redirectUri = `${baseUrl}/api/integrations/zoom/callback`;

  if (!clientId) {
    return NextResponse.json({ error: "Zoom not configured" }, { status: 503 });
  }

  const state = Buffer.from(JSON.stringify({ workspaceId })).toString("base64url");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(`${ZOOM_AUTH_URL}?${params.toString()}`);
}
