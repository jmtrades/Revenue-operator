/**
 * GET /api/workspace/lead-scoring-config — Get optional lead scoring weights for workspace.
 * PATCH /api/workspace/lead-scoring-config — Update weights (omit keys to use defaults).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import {
  getWorkspaceScoringConfig,
  getDefaultScoringConfig,
  type LeadScoringConfig,
} from "@/lib/lead-scoring";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const custom = await getWorkspaceScoringConfig(session.workspaceId);
  const defaults = getDefaultScoringConfig();
  return NextResponse.json({
    config: custom ?? {},
    defaults: defaults,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { config?: LeadScoringConfig };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const config = body.config && typeof body.config === "object" ? body.config : {};
  const db = getDb();
  const now = new Date().toISOString();

  try {
    await db
      .from("workspace_lead_scoring_config")
      .upsert(
        {
          workspace_id: session.workspaceId,
          config,
          updated_at: now,
        },
        { onConflict: "workspace_id" }
      );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save config" },
      { status: 500 }
    );
  }

  const custom = await getWorkspaceScoringConfig(session.workspaceId);
  const defaults = getDefaultScoringConfig();
  return NextResponse.json({
    config: custom ?? {},
    defaults,
  });
}
