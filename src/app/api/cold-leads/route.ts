/**
 * GET /api/cold-leads — List cold lead queue items for the workspace with filtering and sorting.
 * POST /api/cold-leads — Add a lead to the cold lead queue.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

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
      reengagement_strategy,
      next_attempt_at,
      attempts,
      last_attempt_at,
      max_attempts,
      created_at,
      updated_at,
      leads(name, email, phone)
      `,
      { count: "exact" }
    )
    .eq("workspace_id", session.workspaceId);

  if (status) {
    query = query.eq("status", status);
  }

  let orderColumn: "priority" | "next_attempt_at" | "created_at" | "attempts" = "next_attempt_at";
  if (sortBy === "priority") {
    orderColumn = "priority";
  } else if (sortBy === "created_at") {
    orderColumn = "created_at";
  } else if (sortBy === "attempts" || sortBy === "attempt_count") {
    orderColumn = "attempts";
  }

  const { data, error, count } = await query
    .order(orderColumn, { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    log("error", "[cold-leads] GET query failed:", { error: error.message });
    return NextResponse.json({ error: "Failed to load cold leads" }, { status: 500 });
  }

  // Flatten joined lead data (name, email, phone) into each cold lead item
  const items = (data ?? []).map((row: Record<string, unknown>) => {
    const lead = row.leads as { name?: string; email?: string; phone?: string } | null;
    return {
      ...row,
      name: lead?.name ?? "Unknown",
      email: lead?.email ?? undefined,
      phone: lead?.phone ?? undefined,
      leads: undefined, // Remove nested object from response
    };
  });

  return NextResponse.json({
    items,
    total: count ?? 0,
    limit,
    offset,
  });
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  let body: { lead_id?: string; name?: string; phone?: string; email?: string; reason?: string; priority?: string; reengagement_strategy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { reason, priority, reengagement_strategy } = body;
  let lead_id = body.lead_id?.trim() ?? "";

  const db = getDb();

  // If no lead_id provided but name is, create the lead first
  if (!lead_id && body.name?.trim()) {
    const now = new Date().toISOString();
    const { data: newLead, error: createErr } = await db
      .from("leads")
      .insert({
        workspace_id: session.workspaceId,
        name: body.name.trim(),
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        state: "cold",
        status: "cold",
        last_activity_at: now,
        created_at: now,
        opt_out: false,
        metadata: { source: "cold_lead_manual" },
      })
      .select("id")
      .single();

    if (createErr || !newLead) {
      log("error", "[cold-leads] POST lead creation failed:", { error: createErr?.message });
      return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
    }
    lead_id = (newLead as { id: string }).id;
  }

  if (!lead_id) {
    return NextResponse.json({ error: "lead_id or name is required" }, { status: 400 });
  }

  // Verify lead exists and belongs to the workspace
  const { data: lead, error: leadErr } = await db
    .from("leads")
    .select("id, workspace_id, name, email, phone")
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
      reengagement_strategy: (reengagement_strategy ?? "").trim() || null,
      attempts: 0,
      created_at: now,
      updated_at: now,
    })
    .select()
    .maybeSingle();

  if (error) {
    log("error", "[cold-leads] POST insert failed:", { error: error.message });
    return NextResponse.json({ error: "Failed to add lead to cold lead queue" }, { status: 500 });
  }

  // Include lead details in response for immediate UI update
  const leadData = lead as { name?: string; email?: string; phone?: string } | null;
  const response = {
    ...(created as Record<string, unknown>),
    name: leadData?.name ?? body.name ?? "Unknown",
    email: leadData?.email ?? body.email ?? undefined,
    phone: leadData?.phone ?? body.phone ?? undefined,
  };

  return NextResponse.json(response, { status: 201 });
}
