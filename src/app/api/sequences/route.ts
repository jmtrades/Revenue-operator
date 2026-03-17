/**
 * GET /api/sequences — List all follow-up sequences for a workspace.
 * POST /api/sequences — Create a new follow-up sequence.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import {
  createSequence,
  getWorkspaceSequences,
} from "@/lib/sequences/follow-up-engine";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  try {
    const sequences = await getWorkspaceSequences(workspaceId);
    return NextResponse.json({ sequences });
  } catch (error) {
    console.error("[Sequences] Error fetching sequences:", error);
    return NextResponse.json(
      { error: "Failed to fetch sequences" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = session.workspaceId;
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  let body: { name: string; trigger_type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, trigger_type } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  try {
    const sequence = await createSequence(
      workspaceId,
      name,
      trigger_type
    );

    if (!sequence) {
      return NextResponse.json(
        { error: "Failed to create sequence" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sequence }, { status: 201 });
  } catch (error) {
    console.error("[Sequences] Error creating sequence:", error);
    return NextResponse.json(
      { error: "Failed to create sequence" },
      { status: 500 }
    );
  }
}
