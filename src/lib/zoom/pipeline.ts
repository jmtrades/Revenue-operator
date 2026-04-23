/**
 * Zoom pipeline: webhook -> fetch recording -> match lead -> analyze -> execute plan
 */

import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { getPastMeetingParticipants, getRecording } from "./client";
import { matchCallToLead } from "./call-to-lead";
import { analyzeClosingCall } from "./analysis";
// Phase 12f — pipe Zoom transcripts through the unified Phase 12c/12e intel
// stack so we get the same structured CallIntelligenceResult for every source.
import { parseZoomVtt } from "@/lib/calls/ingest/adapters/zoom-cloud";
import { normalizeManualUpload } from "@/lib/calls/ingest/adapters/manual-upload";
import { runIngestion } from "@/lib/calls/ingest/persist";
import { createSupabaseIngestionWriter } from "@/lib/calls/ingest/persist-supabase";

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
  const { data: session } = await db
    .from("call_sessions")
    .select("transcript_text, matched_lead_id, external_meeting_id, external_meeting_uuid, call_started_at, call_ended_at")
    .eq("id", callSessionId)
    .maybeSingle();
  if (!session) return;

  const s = session as {
    transcript_text?: string | null;
    matched_lead_id?: string | null;
    external_meeting_id?: string | null;
    external_meeting_uuid?: string | null;
    call_started_at?: string | null;
    call_ended_at?: string | null;
  };
  const transcript = s.transcript_text ?? "";
  const { data: lead } = s.matched_lead_id ? await db.from("leads").select("name, company").eq("id", s.matched_lead_id).maybeSingle() : { data: null };
  const context = lead ? { leadName: (lead as { name?: string }).name, company: (lead as { company?: string }).company } : undefined;

  const analysis = await analyzeClosingCall(transcript, context);

  await db.from("call_analysis").insert({
    workspace_id: workspaceId,
    call_session_id: callSessionId,
    analysis_json: analysis,
    confidence: analysis.confidence,
    analysis_source: "zoom_transcript",
  });

  // Phase 12f — also run the unified Phase 12c intelligence stack so this call
  // ends up in `call_intelligence_results` alongside HubSpot / manual uploads.
  // Any failure here is swallowed — the legacy analysis above is what gates
  // the post-call plan; this is additive.
  if (transcript && s.external_meeting_id) {
    try {
      const turns = /WEBVTT/i.test(transcript.slice(0, 80))
        ? parseZoomVtt(transcript, null)
        : undefined;
      const normalized = normalizeManualUpload({
        externalId: s.external_meeting_uuid || s.external_meeting_id,
        workspaceId,
        leadId: s.matched_lead_id ?? null,
        startedAtIso: s.call_started_at ?? new Date().toISOString(),
        direction: "unknown",
        sourceLabel: "zoom_cloud",
        turns: turns && turns.length > 0 ? turns : undefined,
        rawText: turns && turns.length > 0 ? null : transcript,
      });
      await runIngestion(normalized, { writer: createSupabaseIngestionWriter() });
    } catch {
      // additive — never fail the post-call flow on unified-intel errors
    }
  }

  if (s.matched_lead_id) {
    await enqueue({
      type: "execute_post_call_plan",
      callSessionId,
      workspaceId,
      leadId: s.matched_lead_id,
    });
  }
}
