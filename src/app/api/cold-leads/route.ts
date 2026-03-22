/**
 * GET /api/cold-leads — List cold lead queue items for the workspace with filtering and sorting.
 * POST /api/cold-leads — Add a lead to the cold lead queue.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  // Get query parameters for filtering and sorting
  const status = req.nextUrl.searchParams.get("status");
  const sortBy = req.nextUrl.searchParams.get("sortBy") || "next_attempt_at";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "100", 10), 500);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0", 10);

  let query = db
    .from("cold_lead_queue")
    .select(
      `
      id,
      lead_id,
      workspace_id,
      status,
      reason,
      priority,
      strategy,
      next_attempt_at,
      attempt_count,
      last_attempted_at,
      created_at,
      updated_at
      `,
      { count: "exact" }
    )
    .eq("workspace_id", session.workspaceId);

  if (status) {
    query = query.eq("status", status);
  }

  let orderColumn: "priority" | "next_attempt_at" | "created_at" | "attempt_count" = "next_attempt_at";
  if (sortBy === "priority") {
    orderColumn = "priority";
  } else if (sortBy === "created_at") {
    orderColumn = "created_at";
  } else if (sortBy === "attempt_count") {
    orderColumn = "attempt_count";
  }

  const { data, error, count } = await query
    .order(orderColumn, { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[cold-leads] GET query failed:", error.message);
    return NextResponse.json({ error: "Failed to load cold leads" }, { status: 500 });
  }

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  let body: { lead_id: string; reason?: string; priority?: string; strategy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { lead_id, reason, priority, strategy } = body;

  if (!lead_id?.trim()) {
    return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  }

  const db = getDb();

  // Verify lead exists and belongs to the workspace
  const { data: lead, error: leadErr } = await db
    .from("leads")
    .select("id, workspace_id")
    .eq("id", lead_id)
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();

  if (leadErr || !lead) {
    return NextResponse.json({ error: "Lead not found or does not belong to your workspace" }, { status: 404 });
  }

  // Check if already in cold lead queue
  const { data: existing } = await db
    .from("cold_lead_queue")
    .select("id")
    .eq("lead_id", lead_id)
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Lead is already in cold lead queue" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: created, error } = await db
    .from("cold_lead_queue")
    .insert({
      lead_id,
      workspace_id: session.workspaceId,
      status: "pending",
      reason: (reason ?? "").trim() || null,
      priority: (priority ?? "medium").trim() || "medium",
      strategy: (strategy ?? "").trim() || null,
      attempt_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error("[cold-leads] POST insert failed:", error.message);
    return NextResponse.json({ error: "Failed to add lead to cold lead queue" }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}
