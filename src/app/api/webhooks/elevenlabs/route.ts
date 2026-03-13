import { NextRequest, NextResponse } from "next/server";
import { getVoiceProvider } from "@/lib/voice";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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
    // eslint-disable-next-line no-console
    console.error("ElevenLabs webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

