/* eslint-disable @typescript-eslint/no-explicit-any -- Admin-only routes with Supabase dynamic queries */
/**
 * Admin export route: full data export as JSON (users, workspaces, agents, calls, leads).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdmin, forbidden } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

const EXPORT_LIMIT = 10_000;

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return forbidden();
  }

  const db = getDb();
  const result: Record<string, any> = {
    exported_at: new Date().toISOString(),
    data: {},
  };

  // Export all users (mask sensitive fields)
  try {
    const { data: users } = await db.from("users").select("id, full_name, created_at, email_verified, last_sign_in_at").limit(EXPORT_LIMIT);
    result.data.users = (users ?? []).map((u: Record<string, any>) => ({
      ...u,
      email_masked: u.email ? u.email.replace(/(.{2}).*(@.*)/, "$1***$2") : null,
    }));
  } catch (err) {
    log("error", "[admin/export] Failed to export users", { error: String(err) });
    result.data.users = [];
  }

  // Export workspaces
  try {
    const { data: workspaces } = await db.from("workspaces").select("id, name, slug, plan, industry, created_at, updated_at, owner_id, trial_ends_at, is_active").limit(EXPORT_LIMIT);
    result.data.workspaces = workspaces ?? [];
  } catch (err) {
    log("error", "[admin/export] Failed to export workspaces", { error: String(err) });
    result.data.workspaces = [];
  }

  // Export agents
  try {
    const { data: agents } = await db.from("agents").select("id, workspace_id, name, voice_id, personality, purpose, is_active, template, created_at, updated_at").limit(EXPORT_LIMIT);
    result.data.agents = agents ?? [];
  } catch (err) {
    log("error", "[admin/export] Failed to export agents", { error: String(err) });
    result.data.agents = [];
  }

  // Export call sessions
  try {
    const { data: calls } = await db.from("call_sessions").select("id, workspace_id, agent_id, lead_id, direction, status, duration_seconds, started_at, ended_at, created_at").limit(EXPORT_LIMIT);
    result.data.call_sessions = calls ?? [];
  } catch (err) {
    log("error", "[admin/export] Failed to export call_sessions", { error: String(err) });
    result.data.call_sessions = [];
  }

  // Export leads
  try {
    const { data: leads } = await db.from("leads").select("id, workspace_id, status, source, created_at, updated_at").limit(EXPORT_LIMIT);
    result.data.leads = leads ?? [];
  } catch (err) {
    log("error", "[admin/export] Failed to export leads", { error: String(err) });
    result.data.leads = [];
  }

  // Export conversations
  try {
    const { data: conversations } = await db.from("conversations").select("id, workspace_id, lead_id, agent_id, channel, status, created_at, updated_at").limit(EXPORT_LIMIT);
    result.data.conversations = conversations ?? [];
  } catch (err) {
    log("error", "[admin/export] Failed to export conversations", { error: String(err) });
    result.data.conversations = [];
  }

  // Export activation events
  try {
    const { data: activations } = await db.from("activation_events").select("id, workspace_id, event_type, created_at").limit(EXPORT_LIMIT);
    result.data.activation_events = activations ?? [];
  } catch (err) {
    log("error", "[admin/export] Failed to export activation_events", { error: String(err) });
    result.data.activation_events = [];
  }

  // Add summaries
  result.summary = {
    users_count: (result.data.users as any[]).length,
    workspaces_count: (result.data.workspaces as any[]).length,
    agents_count: (result.data.agents as any[]).length,
    call_sessions_count: (result.data.call_sessions as any[]).length,
    leads_count: (result.data.leads as any[]).length,
    conversations_count: (result.data.conversations as any[]).length,
    activation_events_count: (result.data.activation_events as any[]).length,
  };

  // Set content disposition for download
  const response = NextResponse.json(result);
  response.headers.set("Content-Disposition", `attachment; filename="revenue-operator-export-${new Date().toISOString().split("T")[0]}.json"`);
  return response;
}
