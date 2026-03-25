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
import { assertSameOrigin } from "@/lib/http/csrf";

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
    if (error) {
      console.error("[workspaces GET session]", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    return NextResponse.json({ workspaces: data ?? [] });
  }
  // Session disabled (dev): never list all workspaces in production — would leak tenant ids/names.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await db.from("workspaces").select("id, name, created_at").order("created_at", { ascending: false });
  if (error) {
    console.error("[workspaces GET dev]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ workspaces: data ?? [] });
}

export async function POST(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  // Without session auth, POST would allow creating workspaces for any owner_id — block in production.
  if (process.env.NODE_ENV === "production" && !isSessionEnabled()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name: string; owner_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name;
  let owner_id = body.owner_id;

  if (isSessionEnabled()) {
    const session = await getSession(request);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Force owner to session user — do not trust body.owner_id.
    owner_id = session.userId;
  }

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
    .maybeSingle();

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
