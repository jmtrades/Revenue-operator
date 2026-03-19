/**
 * ElevenLabs webhook handler.
 * DEPRECATED: This webhook is kept for backwards compatibility in case ElevenLabs was used
 * previously. New voice calls use the Recall voice provider instead.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getVoiceProvider } from "@/lib/voice";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verify webhook signature when ELEVENLABS_WEBHOOK_SECRET is configured
    const elSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    if (elSecret) {
      const signature = req.headers.get("x-elevenlabs-signature") ?? req.headers.get("x-webhook-signature");
      if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }
      const expected = crypto.createHmac("sha256", elSecret).update(rawBody).digest("hex");
      const expectedBuf = Buffer.from(expected, "hex");
      const providedBuf = Buffer.from(signature.replace(/^sha256=/, ""), "hex");
      if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      console.error("[elevenlabs-webhook] ELEVENLABS_WEBHOOK_SECRET not configured — rejecting unsigned webhook");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
    }

    const body = JSON.parse(rawBody);
    const voice = getVoiceProvider();
    const event = voice.parseWebhookEvent(body);

    const workspaceId = event.metadata?.workspace_id;

    switch (event.type) {
      case "call-started": {
        await supabase.from("call_sessions").insert({
          workspace_id: workspaceId,
          external_meeting_id: event.callId,
          provider: "elevenlabs",
          call_started_at: new Date().toISOString(),
        });
        break;
      }

      case "tool-call": {
        if (event.toolName === "capture_lead") {
          await supabase.from("leads").insert({
            workspace_id: workspaceId,
            name: (event.toolArgs?.name as string) || "Unknown",
            phone: (event.toolArgs?.phone as string) || "",
            email: (event.toolArgs?.email as string) || "",
            source: "ai_call",
          });
        }
        if (event.toolName === "book_appointment") {
          await supabase.from("appointments").insert({
            workspace_id: workspaceId,
            date: event.toolArgs?.date as string,
            time: event.toolArgs?.time as string,
            service: event.toolArgs?.service as string,
            notes: event.toolArgs?.notes as string,
            phone: event.toolArgs?.phone as string,
          });
        }
        break;
      }

      case "end-of-call": {
        await supabase
          .from("call_sessions")
          .update({
            outcome: "completed",
            transcript_text: event.transcript,
            summary: event.summary,
            recording_url: event.recordingUrl,
            duration_seconds: event.duration,
            call_ended_at: new Date().toISOString(),
          })
          .eq("external_meeting_id", event.callId);
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ElevenLabs webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

