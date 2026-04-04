/**
 * Zoom pipeline: webhook -> fetch recording -> match lead -> analyze -> execute plan
 */

import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { getPastMeetingParticipants, getRecording } from "./client";
import { matchCallToLead } from "./call-to-lead";
import { analyzeClosingCall } from "./analysis";

export async function processZoomWebhook(
  webhookId: string,
  workspaceId: string,
  meetingId: string,
  meetingUuid: string
): Promise<void> {
  const db = getDb();
  const { data: raw } = await db.from("raw_webhook_events").select("payload").eq("id", webhookId).maybeSingle();
  if (!raw) return;

  const _payload = (raw as { payload?: { payload?: { object?: Record<string, unknown> } } }).payload?.payload?.object ?? {};
  const participantEmails: string[] = [];
  const participantNames: string[] = [];

  try {
    const participants = await getPastMeetingParticipants(workspaceId, meetingId);
    for (const p of participants) {
      if (p.user_email) participantEmails.push(p.user_email);
      if (p.name) participantNames.push(p.name);
    }
  } catch {
    // continue without participants
  }

  const match = await matchCallToLead(workspaceId, {
    participantEmails,
    participantNames,
  });

  const { data: session } = await db.from("call_sessions").insert({
    workspace_id: workspaceId,
    lead_id: match.lead_id,
    external_meeting_id: meetingId,
    external_meeting_uuid: meetingUuid,
    provider: "zoom",
    matched_lead_id: match.lead_id,
    matched_confidence: match.confidence,
    outcome: null,
    transcript: [],
  }).select("id").maybeSingle();

  if (!session) return;

  const sessionId = (session as { id: string }).id;

  await db.from("raw_webhook_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", webhookId);
  await db.from("zoom_accounts").update({ last_webhook_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId);

  await enqueue({
    type: "fetch_zoom_recording",
    callSessionId: sessionId,
    workspaceId,
    meetingId,
  });
}

export async function fetchRecordingAndTranscript(
  callSessionId: string,
  workspaceId: string,
  meetingId: string
): Promise<void> {
  const db = getDb();
  const { data: settings } = await db.from("settings").select("consent_mode, call_aware_enabled").eq("workspace_id", workspaceId).maybeSingle();
  const callAware = (settings as { call_aware_enabled?: boolean })?.call_aware_enabled ?? false;
  if (!callAware) return;

  let recording: Awaited<ReturnType<typeof getRecording>> = null;
  try {
    recording = await getRecording(workspaceId, meetingId);
  } catch {
    await db.from("call_sessions").update({ call_ended_at: new Date().toISOString() }).eq("id", callSessionId);
    await enqueue({ type: "analyze_call", callSessionId, workspaceId });
    return;
  }

  const consentMode = (settings as { consent_mode?: string })?.consent_mode ?? "soft";
  let transcriptText = "";
  let consentGranted = consentMode === "off" ? false : consentMode === "soft";

  const files = recording?.recording_files ?? [];
  for (const f of files) {
    if ((f.recording_type === "transcript" || f.file_type === "TRANSCRIPT") && f.download_url) {
      try {
        const { getAccessToken } = await import("./client");
        const token = await getAccessToken(workspaceId);
        const res = await fetch(f.download_url + (f.download_url.includes("?") ? "&" : "?") + "access_token=" + encodeURIComponent(token));
        if (res.ok) transcriptText = await res.text();
      } catch {
        // skip
      }
    }
  }

  if (transcriptText && consentMode === "strict") {
    const lower = transcriptText.toLowerCase();
    consentGranted = /\b(i consent|i agree|yes.*record|record.*yes)\b/.test(lower);
  }

  await db.from("call_sessions").update({
    transcript_text: consentGranted ? transcriptText : null,
    consent_granted: consentGranted,
    consent_mode: consentMode,
    call_ended_at: new Date().toISOString(),
  }).eq("id", callSessionId);

  if (transcriptText) {
    await db.from("call_assets").insert({
      workspace_id: workspaceId,
      call_session_id: callSessionId,
      type: "transcript",
      provider: "zoom",
      content_text: consentGranted ? transcriptText : transcriptText.slice(0, 200) + " [summary only - consent not granted]",
    });
  }

  await enqueue({ type: "analyze_call", callSessionId, workspaceId });
}

export async function runAnalyzeCall(callSessionId: string, workspaceId: string): Promise<void> {
  const db = getDb();
  const { data: session } = await db.from("call_sessions").select("metadata, lead_id").eq("id", callSessionId).maybeSingle();
  if (!session) return;

  const s = session as { metadata?: Record<string, unknown> | null; lead_id?: string | null };
  const transcript = typeof s.metadata?.transcript === "string" ? s.metadata.transcript as string : typeof s.metadata?.transcript_text === "string" ? s.metadata.transcript_text as string : "";
  const { data: lead } = s.lead_id ? await db.from("leads").select("name, company").eq("id", s.lead_id).maybeSingle() : { data: null };
  const context = lead ? { leadName: (lead as { name?: string }).name, company: (lead as { company?: string }).company } : undefined;

  const analysis = await analyzeClosingCall(transcript, context);

  await db.from("call_analysis").insert({
    workspace_id: workspaceId,
    call_session_id: callSessionId,
    analysis_json: analysis,
    confidence: analysis.confidence,
    analysis_source: "zoom_transcript",
  });

  if (s.lead_id) {
    await enqueue({
      type: "execute_post_call_plan",
      callSessionId,
      workspaceId,
      leadId: s.lead_id,
    });
  }
}
