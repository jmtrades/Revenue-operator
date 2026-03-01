/**
 * Appointment reminders: 24h and 2h before start_time.
 * Uses v7 appointments table; enqueues SendReminder so worker sends SMS (no direct send).
 * Idempotent: reminders_sent array tracks '24h' and '2h'.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/runtime";
import { getDb } from "@/lib/db/queries";
import { enqueueAction } from "@/lib/action-queue";
import type { ActionCommand } from "@/lib/action-queue/types";

const WINDOW_MINUTES = 30;

type ApptRow = { id: string; workspace_id: string; lead_id: string; title: string; start_time: string; reminders_sent: string[] | null };

export async function GET(req: NextRequest) {
  const authErr = assertCronAuthorized(req);
  if (authErr) return authErr;

  const db = getDb();
  const now = new Date();
  const in24hStart = new Date(now.getTime() + (24 * 60 - WINDOW_MINUTES) * 60 * 1000);
  const in24hEnd = new Date(now.getTime() + (24 * 60 + WINDOW_MINUTES) * 60 * 1000);
  const in2hStart = new Date(now.getTime() + (2 * 60 - WINDOW_MINUTES) * 60 * 1000);
  const in2hEnd = new Date(now.getTime() + (2 * 60 + WINDOW_MINUTES) * 60 * 1000);

  let appointments24h: ApptRow[] = [];
  let appointments2h: ApptRow[] = [];

  try {
    const { data: rows } = await db
      .from("appointments")
      .select("id, workspace_id, lead_id, title, start_time, reminders_sent")
      .in("status", ["confirmed"])
      .gte("start_time", in24hStart.toISOString())
      .lte("start_time", in24hEnd.toISOString());
    appointments24h = ((rows ?? []) as ApptRow[]).filter((r) => !(r.reminders_sent ?? []).includes("24h"));
  } catch {
    return NextResponse.json({ ok: true, enqueued_24h: 0, enqueued_2h: 0, message: "appointments table not available" });
  }

  try {
    const { data: rows2 } = await db
      .from("appointments")
      .select("id, workspace_id, lead_id, title, start_time, reminders_sent")
      .in("status", ["confirmed"])
      .gte("start_time", in2hStart.toISOString())
      .lte("start_time", in2hEnd.toISOString());
    appointments2h = ((rows2 ?? []) as ApptRow[]).filter((r) => !(r.reminders_sent ?? []).includes("2h"));
  } catch {
    // ignore
  }

  let enqueued24h = 0;
  let enqueued2h = 0;

  for (const appt of appointments24h) {
    const conv = await getOrCreateConversation(db, appt.lead_id);
    if (!conv) continue;
    const content = formatReminder(appt.title, appt.start_time, 24);
    const cmd: ActionCommand = {
      type: "SendReminder",
      workspace_id: appt.workspace_id,
      lead_id: appt.lead_id,
      payload: { conversation_id: conv, channel: "sms", content, reminder_type: "24h" },
      dedup_key: `appt-reminder-${appt.id}-24h`,
    };
    const id = await enqueueAction(cmd);
    if (id) {
      enqueued24h++;
      try {
        await db.from("appointments").update({ reminders_sent: [...(appt.reminders_sent ?? []), "24h"] }).eq("id", appt.id);
      } catch {
        // best-effort
      }
    }
  }

  for (const appt of appointments2h) {
    const conv = await getOrCreateConversation(db, appt.lead_id);
    if (!conv) continue;
    const content = formatReminder(appt.title, appt.start_time, 2);
    const cmd: ActionCommand = {
      type: "SendReminder",
      workspace_id: appt.workspace_id,
      lead_id: appt.lead_id,
      payload: { conversation_id: conv, channel: "sms", content, reminder_type: "2h" },
      dedup_key: `appt-reminder-${appt.id}-2h`,
    };
    const id = await enqueueAction(cmd);
    if (id) {
      enqueued2h++;
      try {
        await db.from("appointments").update({ reminders_sent: [...(appt.reminders_sent ?? []), "2h"] }).eq("id", appt.id);
      } catch {
        // best-effort
      }
    }
  }

  return NextResponse.json({ ok: true, enqueued_24h: enqueued24h, enqueued_2h: enqueued2h });
}

async function getOrCreateConversation(db: ReturnType<typeof getDb>, leadId: string): Promise<string | null> {
  const { data: existing } = await db.from("conversations").select("id").eq("lead_id", leadId).eq("channel", "sms").limit(1).maybeSingle();
  if (existing) return (existing as { id: string }).id;
  const { data: created, error } = await db
    .from("conversations")
    .insert({ lead_id: leadId, channel: "sms", external_thread_id: null, updated_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !created) return null;
  return (created as { id: string }).id;
}

function formatReminder(title: string, startTime: string, hours: number): string {
  const d = new Date(startTime);
  const dateStr = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timeStr = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `Reminder: ${title} is in ${hours} hour${hours === 1 ? "" : "s"} — ${dateStr} at ${timeStr}.`;
}
