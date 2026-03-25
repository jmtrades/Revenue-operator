/**
 * Admin export route: full data export as JSON (users, workspaces, agents, calls, leads).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdmin, forbidden } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return forbidden();
  }

  const db = getDb();
  const result: Record<string, any> = {
    exported_at: new Date().toISOString(),
    data: {},
  };

  // Export all users
  try {
    const { data: users } = await db.from("users").select("*");
    result.data.users = users ?? [];
  } catch (err) {
    result.data.users = [];
  }

  // Export all workspaces
  try {
    const { data: workspaces } = await db.from("workspaces").select("*");
    result.data.workspaces = workspaces ?? [];
  } catch (err) {
    result.data.workspaces = [];
  }

  // Export all agents
  try {
    const { data: agents } = await db.from("agents").select("*");
    result.data.agents = agents ?? [];
  } catch (err) {
    result.data.agents = [];
  }

  // Export all call sessions
  try {
    const { data: calls } = await db.from("call_sessions").select("*");
    result.data.call_sessions = calls ?? [];
  } catch (err) {
    result.data.call_sessions = [];
  }

  // Export all leads
  try {
    const { data: leads } = await db.from("leads").select("*");
    result.data.leads = leads ?? [];
  } catch (err) {
    result.data.leads = [];
  }

  // Export all conversations
  try {
    const { data: conversations } = await db.from("conversations").select("*");
    result.data.conversations = conversations ?? [];
  } catch (err) {
    result.data.conversations = [];
  }

  // Export all activation events
  try {
    const { data: activations } = await db.from("activation_events").select("*");
    result.data.activation_events = activations ?? [];
  } catch (err) {
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
