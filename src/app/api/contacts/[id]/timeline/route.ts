export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

type TimelineEvent =
  | {
      id: string;
      type: "call";
      created_at: string;
      direction?: string | null;
      duration_seconds?: number | null;
      outcome?: string | null;
      summary?: string | null;
      transcript?: string | null;
      recording_url?: string | null;
    }
  | {
      id: string;
      type: "message";
      created_at: string;
      channel?: string | null;
      direction?: string | null;
      status?: string | null;
      content?: string | null;
    }
  | {
      id: string;
      type: "booking";
      created_at: string;
      scheduled_at?: string | null;
      service_type?: string | null;
      status?: string | null;
      estimated_value?: number | null;
      attribution_source?: string | null;
    }
  | {
      id: string;
      type: "workflow";
      created_at: string;
      workflow_id?: string | null;
      status?: string | null;
      next_step_at?: string | null;
      stop_reason?: string | null;
    }
  | {
      id: string;
      type: "campaign";
      created_at: string;
      campaign_id?: string | null;
      status?: string | null;
      current_step?: number | null;
      outcome?: string | null;
    };

async function getTimeline(req: NextRequest, id: string) {
  const db = getDb();

  const { data: contact, error: contactError } = await db
    .from("leads")
    .select("id, workspace_id")
    .eq("id", id)
    .maybeSingle();
  if (contactError) return NextResponse.json({ error: contactError.message }, { status: 500 });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const workspaceId = (contact as { workspace_id: string }).workspace_id;
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "60");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 10), 150) : 60;

  const events: TimelineEvent[] = [];

  // Calls
  try {
    const { data: calls } = await db
      .from("call_sessions")
      .select("id, created_at, direction, duration_seconds, outcome, summary, transcript, recording_url")
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);
    (calls ?? []).forEach((c: Record<string, unknown>) =>
      events.push({
        id: String(c.id),
        type: "call",
        created_at: String(c.created_at),
        direction: (c.direction as string | null) ?? null,
        duration_seconds: (c.duration_seconds as number | null) ?? null,
        outcome: (c.outcome as string | null) ?? null,
        summary: (c.summary as string | null) ?? null,
        transcript: (c.transcript as string | null) ?? null,
        recording_url: (c.recording_url as string | null) ?? null,
      }),
    );
  } catch {
    // Table may not exist in some environments
  }

  // Messages
  try {
    const { data: messages } = await db
      .from("messages")
      .select("id, created_at, channel, direction, status, content")
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);
    (messages ?? []).forEach((m: Record<string, unknown>) =>
      events.push({
        id: String(m.id),
        type: "message",
        created_at: String(m.created_at),
        channel: (m.channel as string | null) ?? null,
        direction: (m.direction as string | null) ?? null,
        status: (m.status as string | null) ?? null,
        content: (m.content as string | null) ?? null,
      }),
    );
  } catch {
    // Table may not exist in some environments
  }

  // Bookings
  try {
    const { data: bookings } = await db
      .from("bookings")
      .select("id, created_at, scheduled_at, service_type, status, estimated_value, attribution_source")
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);
    (bookings ?? []).forEach((b: Record<string, unknown>) =>
      events.push({
        id: String(b.id),
        type: "booking",
        created_at: String(b.created_at),
        scheduled_at: (b.scheduled_at as string | null) ?? null,
        service_type: (b.service_type as string | null) ?? null,
        status: (b.status as string | null) ?? null,
        estimated_value: (b.estimated_value as number | null) ?? null,
        attribution_source: (b.attribution_source as string | null) ?? null,
      }),
    );
  } catch {
    // Table may not exist in some environments
  }

  // Workflow enrollments
  try {
    const { data: enrollments } = await db
      .from("workflow_enrollments")
      .select("id, enrolled_at, workflow_id, status, next_step_at, stop_reason")
      .eq("contact_id", id)
      .order("enrolled_at", { ascending: false })
      .limit(limit);
    (enrollments ?? []).forEach((e: Record<string, unknown>) =>
      events.push({
        id: String(e.id),
        type: "workflow",
        created_at: String((e.enrolled_at as string | null) ?? (e.created_at as string | null) ?? new Date().toISOString()),
        workflow_id: (e.workflow_id as string | null) ?? null,
        status: (e.status as string | null) ?? null,
        next_step_at: (e.next_step_at as string | null) ?? null,
        stop_reason: (e.stop_reason as string | null) ?? null,
      }),
    );
  } catch {
    // Table may not exist in some environments
  }

  // Campaign enrollments
  try {
    const { data: enrollments } = await db
      .from("campaign_enrollments")
      .select("id, enrolled_at, campaign_id, status, current_step, outcome")
      .eq("contact_id", id)
      .order("enrolled_at", { ascending: false })
      .limit(limit);
    (enrollments ?? []).forEach((e: Record<string, unknown>) =>
      events.push({
        id: String(e.id),
        type: "campaign",
        created_at: String((e.enrolled_at as string | null) ?? (e.created_at as string | null) ?? new Date().toISOString()),
        campaign_id: (e.campaign_id as string | null) ?? null,
        status: (e.status as string | null) ?? null,
        current_step: (e.current_step as number | null) ?? null,
        outcome: (e.outcome as string | null) ?? null,
      }),
    );
  } catch {
    // Table may not exist in some environments
  }

  events.sort((a, b) => {
    const at = new Date(a.created_at).getTime();
    const bt = new Date(b.created_at).getTime();
    return bt - at;
  });

  return NextResponse.json({ events: events.slice(0, limit) });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = String(resolvedParams.id ?? "");
    if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return await getTimeline(req, id);
  } catch (err) {
    console.error("[API Error] contacts/[id]/timeline GET:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

