/**
 * POST /api/cold-leads/reengage — Trigger re-engagement for pending cold leads.
 * Accepts { lead_ids?: string[], strategy?: string }.
 * For each lead, checks if workspace communication_mode and lead channel_preferences allow engagement,
 * then marks as in_progress.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  let body: { lead_ids?: string[]; strategy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { lead_ids, strategy } = body;
  const db = getDb();

  // Get workspace communication mode
  const { data: workspace } = await db
    .from("workspaces")
    .select("communication_mode")
    .eq("id", session.workspaceId)
    .maybeSingle();

  const workspaceCommunicationMode = (workspace as { communication_mode?: string | null })?.communication_mode ?? "all";

  // Get cold lead queue items to process
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
      strategy
      `
    )
    .eq("workspace_id", session.workspaceId)
    .eq("status", "pending");

  if (Array.isArray(lead_ids) && lead_ids.length > 0) {
    query = query.in("lead_id", lead_ids);
  }

  const { data: queueItems, error: queueErr } = await query;

  if (queueErr) {
    console.error("[cold-leads/reengage] query failed:", queueErr.message);
    return NextResponse.json({ error: "Failed to fetch cold leads" }, { status: 500 });
  }

  const itemsToProcess = (queueItems ?? []) as Array<{
    id: string;
    lead_id: string;
    workspace_id: string;
    status: string;
    reason?: string;
    priority?: string;
    strategy?: string;
  }>;

  if (itemsToProcess.length === 0) {
    return NextResponse.json({ updated: [], skipped: [] });
  }

  // Fetch all associated leads and their channel preferences
  const leadIds = itemsToProcess.map((item) => item.lead_id);
  const { data: leads, error: leadsErr } = await db
    .from("leads")
    .select("id, channel_preferences")
    .in("id", leadIds);

  if (leadsErr) {
    console.error("[cold-leads/reengage] leads query failed:", leadsErr.message);
    return NextResponse.json({ error: "Failed to fetch lead preferences" }, { status: 500 });
  }

  const leadPreferences = ((leads ?? []) as Array<{ id: string; channel_preferences?: Record<string, unknown> | null }>).reduce(
    (acc, lead) => {
      acc[lead.id] = lead.channel_preferences ?? { call: true, sms: true, email: true };
      return acc;
    },
    {} as Record<string, Record<string, unknown>>
  );

  const updated: Array<{ id: string; lead_id: string; status: string }> = [];
  const skipped: Array<{ id: string; lead_id: string; reason: string }> = [];

  // Process each queue item
  for (const item of itemsToProcess) {
    const preferences = leadPreferences[item.lead_id] as { call?: boolean; sms?: boolean; email?: boolean };

    // Check if workspace communication mode allows engagement
    const canEngage = canWorkspaceEngage(workspaceCommunicationMode, preferences);

    if (!canEngage) {
      skipped.push({
        id: item.id,
        lead_id: item.lead_id,
        reason: `Workspace communication mode '${workspaceCommunicationMode}' or lead preferences do not allow engagement`,
      });
      continue;
    }

    // Update status to in_progress
    const { error: updateErr } = await db
      .from("cold_lead_queue")
      .update({
        status: "in_progress",
        strategy: strategy ?? item.strategy ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (updateErr) {
      skipped.push({
        id: item.id,
        lead_id: item.lead_id,
        reason: "Failed to update status",
      });
      continue;
    }

    updated.push({
      id: item.id,
      lead_id: item.lead_id,
      status: "in_progress",
    });
  }

  return NextResponse.json({
    updated,
    skipped,
    total_processed: itemsToProcess.length,
  });
}

function canWorkspaceEngage(
  communicationMode: string,
  preferences: { call?: boolean; sms?: boolean; email?: boolean }
): boolean {
  // If workspace allows all communication, check lead preferences
  if (communicationMode === "all") {
    return preferences.call === true || preferences.sms === true || preferences.email === true;
  }

  // If workspace only allows calls, check if lead accepts calls
  if (communicationMode === "calls_only") {
    return preferences.call === true;
  }

  // If workspace only allows texts, check if lead accepts SMS
  if (communicationMode === "texts_only") {
    return preferences.sms === true;
  }

  // If workspace allows calls and texts
  if (communicationMode === "calls_and_texts") {
    return preferences.call === true || preferences.sms === true;
  }

  // Default: require at least one channel preference to be true
  return preferences.call === true || preferences.sms === true || preferences.email === true;
}
