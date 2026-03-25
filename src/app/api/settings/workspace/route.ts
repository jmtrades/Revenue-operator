export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  const db = getDb();
  const { data, error } = await db
    .from("settings")
    .select("*")
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();
  const pgCode =
    error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
  if (error && pgCode !== "PGRST116") {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
  return NextResponse.json({ workspace_id: session.workspaceId, settings: data ?? null });
}

export async function PATCH(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  let body: { outbound_config?: unknown };
  try {
    body = (await req.json()) as { outbound_config?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const outbound_config = body?.outbound_config;
  if (!outbound_config || typeof outbound_config !== "object") {
    return NextResponse.json({ error: "outbound_config required" }, { status: 400 });
  }

  const db = getDb();
  const { data, error } = await db
    .from("settings")
    .upsert(
      {
        workspace_id: session.workspaceId,
        outbound_config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" },
    )
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });

  return NextResponse.json({ ok: true, settings: data ?? null });
}

