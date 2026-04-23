/**
 * Admin export route: full data export as JSON (users, workspaces, agents, calls, leads).
 * Uses cursor-based pagination (1000 rows per page) with a 50 000-row safety limit per table.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdmin, forbidden } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/queries";

const PAGE_SIZE = 1000;
const MAX_ROWS = 50_000;

/**
 * Fetch all rows from `table` using cursor-based pagination on `id`.
 * Only the columns listed in `columns` are selected.
 */
type Row = Record<string, unknown> & { id: string };

async function fetchPaginated(
  db: ReturnType<typeof getDb>,
  table: string,
  columns: string,
): Promise<Row[]> {
  const rows: Row[] = [];
  let lastId: string | null = null;

  while (rows.length < MAX_ROWS) {
    let query = db
      .from(table)
      .select(columns)
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);

    if (lastId) {
      query = query.gt("id", lastId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) break;

    rows.push(...(data as unknown as Row[]));
    lastId = (data[data.length - 1] as unknown as Row).id;

    if (data.length < PAGE_SIZE) break;
  }

  return rows;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return forbidden();
  }

  const db = getDb();
  const data: Record<string, Row[]> = {};
  const result: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    data,
  };

  // Export users (mask sensitive fields)
  try {
    const users = await fetchPaginated(db, "users", "id, full_name, created_at, email_verified, last_sign_in_at");
    data.users = users.map((u) => ({
      ...u,
      email_masked: typeof u.email === "string" ? u.email.replace(/(.{2}).*(@.*)/, "$1***$2") : null,
    })) as Row[];
  } catch {
    data.users = [];
  }

  // Export workspaces
  try {
    data.workspaces = await fetchPaginated(db, "workspaces", "id, name, owner_id, created_at, updated_at");
  } catch {
    data.workspaces = [];
  }

  // Export agents
  try {
    data.agents = await fetchPaginated(db, "agents", "id, name, workspace_id, type, created_at, updated_at");
  } catch {
    data.agents = [];
  }

  // Export call sessions
  try {
    data.call_sessions = await fetchPaginated(
      db,
      "call_sessions",
      "id, agent_id, workspace_id, status, outcome, duration_seconds, created_at",
    );
  } catch {
    data.call_sessions = [];
  }

  // Export leads
  try {
    data.leads = await fetchPaginated(db, "leads", "id, workspace_id, name, status, score, created_at, updated_at");
  } catch {
    data.leads = [];
  }

  // Export conversations
  try {
    data.conversations = await fetchPaginated(
      db,
      "conversations",
      "id, workspace_id, agent_id, status, created_at, updated_at",
    );
  } catch {
    data.conversations = [];
  }

  // Export activation events
  try {
    data.activation_events = await fetchPaginated(
      db,
      "activation_events",
      "id, workspace_id, event_type, created_at",
    );
  } catch {
    data.activation_events = [];
  }

  // Add summaries
  result.summary = {
    users_count: data.users.length,
    workspaces_count: data.workspaces.length,
    agents_count: data.agents.length,
    call_sessions_count: data.call_sessions.length,
    leads_count: data.leads.length,
    conversations_count: data.conversations.length,
    activation_events_count: data.activation_events.length,
    max_rows_per_table: MAX_ROWS,
  };

  // Set content disposition for download
  const response = NextResponse.json(result);
  response.headers.set("Content-Disposition", `attachment; filename="revenue-operator-export-${new Date().toISOString().split("T")[0]}.json"`);
  return response;
}
