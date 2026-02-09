export const dynamic = "force-dynamic";

/**
 * Create workspace - for onboarding
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

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
    console.error("Workspace create error:", error);
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
