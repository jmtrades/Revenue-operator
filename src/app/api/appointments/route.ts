/**
 * GET /api/appointments — List appointments for workspace (v7 appointments table).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const db = getDb();
  const { data: rows, error } = await db
    .from("appointments")
    .select("id, lead_id, title, start_time, end_time, location, status, notes")
    .eq("workspace_id", workspaceId)
    .order("start_time", { ascending: true })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = (rows ?? []) as { id: string; lead_id: string; title: string; start_time: string; end_time?: string | null; location?: string | null; status: string; notes?: string | null }[];
  const leadIds = [...new Set(list.map((a) => a.lead_id))];
  const { data: leadRows } = leadIds.length
    ? await db.from("leads").select("id, name, phone").in("id", leadIds)
    : { data: [] };
  const leadMap = ((leadRows ?? []) as { id: string; name?: string | null; phone?: string | null }[]).reduce(
    (acc, l) => {
      acc[l.id] = l;
      return acc;
    },
    {} as Record<string, { name?: string | null; phone?: string | null }>
  );

  const appointments = list.map((a) => {
    const lead = leadMap[a.lead_id];
    const start = new Date(a.start_time);
    return {
      id: a.id,
      lead_id: a.lead_id,
      title: a.title,
      start_time: a.start_time,
      end_time: a.end_time,
      location: a.location,
      status: a.status,
      notes: a.notes,
      contactName: lead?.name ?? "Contact",
      contactPhone: lead?.phone ?? "",
      date: start.toISOString().slice(0, 10),
      time: start.toTimeString().slice(0, 5),
      type: a.title,
      source: "Inbound call" as const,
    };
  });

  return NextResponse.json({ appointments });
}
