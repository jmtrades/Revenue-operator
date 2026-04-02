/**
 * GET /api/workspace/export — Export all workspace data as JSON.
 * GDPR Article 20 — Right to data portability.
 *
 * Returns a JSON bundle of all workspace data: leads, conversations,
 * call sessions, appointments, agents, settings, and automation config.
 *
 * This is the user's data. They own it. They can leave with it.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

const EXPORT_TABLES = [
  { table: "leads", select: "id, name, email, phone, company, state, qualification_score, metadata, opt_out, created_at, last_activity_at" },
  { table: "conversations", select: "id, lead_id, channel, direction, body, created_at" },
  { table: "call_sessions", select: "id, lead_id, call_started_at, call_ended_at, transcript_text, summary, outcome, recording_url" },
  { table: "appointments", select: "id, lead_id, title, start_time, end_time, location, notes, status, created_at" },
  { table: "agents", select: "id, name, voice_id, greeting, personality, system_prompt, created_at" },
  { table: "follow_ups", select: "id, lead_id, channel, status, scheduled_at, completed_at, content, created_at" },
  { table: "sequences", select: "id, name, steps, status, created_at" },
  { table: "sms_logs", select: "id, lead_id, direction, from_number, to_number, body, status, created_at" },
] as const;

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const workspaceId = session.workspaceId;

  // Fetch workspace metadata
  const { data: workspace } = await db
    .from("workspaces")
    .select("id, name, industry, website, agent_name, created_at, notification_preferences, metadata")
    .eq("id", workspaceId)
    .maybeSingle();

  // Fetch all data tables in parallel
  const results = await Promise.allSettled(
    EXPORT_TABLES.map(async ({ table, select }) => {
      try {
        const { data, error } = await db
          .from(table)
          .select(select)
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(10000); // Safety cap

        if (error) {
          log("error", `[export] Error fetching ${table}:`, { error: error.message });
          return { table, data: [], error: error.message };
        }
        return { table, data: data ?? [], error: null };
      } catch {
        return { table, data: [], error: "Table not available" };
      }
    })
  );

  // Assemble export bundle
  const exportData: Record<string, unknown> = {
    _meta: {
      exported_at: new Date().toISOString(),
      workspace_id: workspaceId,
      workspace_name: (workspace as { name?: string } | null)?.name ?? "Unknown",
      format_version: "1.0",
      tables_included: EXPORT_TABLES.map((t) => t.table),
      note: "This is your data. You own it. This export is provided under GDPR Article 20 — Right to Data Portability.",
    },
    workspace: workspace ?? {},
  };

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { table, data, error } = result.value;
      exportData[table] = { count: data.length, records: data };
      if (error) {
        exportData[`${table}_note`] = `Partial export: ${error}`;
      }
    }
  }

  // Return as downloadable JSON
  const json = JSON.stringify(exportData, null, 2);
  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="revenue-operator-export-${workspaceId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
