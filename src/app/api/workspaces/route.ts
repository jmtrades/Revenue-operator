export const dynamic = "force-dynamic";

/**
 * List workspaces (GET) or create workspace (POST).
 * GET requires session; returns only workspaces for the logged-in user.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { isSessionEnabled } from "@/lib/auth/session";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const db = getDb();
  if (isSessionEnabled()) {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await db
      .from("workspaces")
      .select("id, name, created_at")
      .eq("owner_id", session.userId)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error?.message ?? String(error) }, { status: 500 });
    return NextResponse.json({ workspaces: data ?? [] });
  }
  const { data, error } = await db.from("workspaces").select("id, name, created_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error?.message ?? String(error) }, { status: 500 });
  return NextResponse.json({ workspaces: data ?? [] });
}

export async function POST(request: NextRequest) {
  let body: { name: string; owner_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, owner_id } = body;
  if (!name || !owner_id) {
    return NextResponse.json(
      { error: "name and owner_id required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const { data: workspace, error } = await db
    .from("workspaces")
    .insert({
      name,
      owner_id,
      autonomy_level: "assisted",
      kill_switch: false,
    })
    .select()
    .single();

  if (error) {
    log("error", "Workspace create error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }

  if (workspace) {
    await db.from("settings").insert({
      workspace_id: workspace.id,
      risk_level: "balanced",
    });
  }

  return NextResponse.json(workspace);
}
