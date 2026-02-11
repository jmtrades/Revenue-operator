/**
 * Zoom API client: get access token, fetch meeting/recording/transcript
 */

import { getDb } from "@/lib/db/queries";
import { decrypt } from "@/lib/encryption";

async function getAccessToken(workspaceId: string): Promise<string> {
  const db = getDb();
  const { data } = await db
    .from("zoom_accounts")
    .select("access_token_enc, refresh_token_enc, expires_at")
    .eq("workspace_id", workspaceId)
    .single();

  if (!data) throw new Error("Zoom not connected");
  const row = data as { access_token_enc: string; refresh_token_enc: string; expires_at: string };
  const expiresAt = new Date(row.expires_at);
  const now = new Date();
  if (expiresAt.getTime() - now.getTime() < 60 * 1000) {
    const refreshed = await refreshToken(workspaceId, row.refresh_token_enc);
    return refreshed;
  }
  return decrypt(row.access_token_enc);
}

async function refreshToken(workspaceId: string, refreshEnc: string): Promise<string> {
  const refreshTokenRaw = await decrypt(refreshEnc);
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Zoom not configured");

  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenRaw,
    }).toString(),
  });

  if (!res.ok) throw new Error("Zoom token refresh failed");
  const data = (await res.json()) as { access_token: string; expires_in: number };
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

  const db = getDb();
  const { encrypt } = await import("@/lib/encryption");
  const accessEnc = await encrypt(data.access_token);
  await db
    .from("zoom_accounts")
    .update({
      access_token_enc: accessEnc,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId);

  return data.access_token;
}

export { getAccessToken };

export async function zoomFetch(
  workspaceId: string,
  path: string,
  opts?: RequestInit
): Promise<Response> {
  const token = await getAccessToken(workspaceId);
  return fetch(`https://api.zoom.us/v2${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  });
}

export interface ZoomMeeting {
  id: number;
  uuid: string;
  host_id: string;
  start_time?: string;
  duration?: number;
  participants?: Array<{ id: string; user_email?: string; user_name?: string }>;
}

export async function getMeeting(workspaceId: string, meetingId: string): Promise<ZoomMeeting | null> {
  const res = await zoomFetch(workspaceId, `/meetings/${meetingId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getPastMeetingParticipants(
  workspaceId: string,
  meetingId: string
): Promise<Array<{ id: string; user_email?: string; name?: string }>> {
  const res = await zoomFetch(workspaceId, `/report/meetings/${meetingId}/participants`);
  if (!res.ok) return [];
  const data = (await res.json()) as { participants?: Array<{ id: string; user_email?: string; name?: string }> };
  return data.participants ?? [];
}

export interface ZoomRecording {
  id: string;
  meeting_id: string;
  recording_files?: Array<{
    id: string;
    recording_type: string;
    download_url?: string;
    status: string;
    file_type?: string;
  }>;
}

export async function getRecording(workspaceId: string, meetingId: string): Promise<ZoomRecording | null> {
  const res = await zoomFetch(workspaceId, `/meetings/${meetingId}/recordings`);
  if (!res.ok) return null;
  return res.json();
}
