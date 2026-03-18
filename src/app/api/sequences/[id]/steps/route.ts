/**
 * GET /api/sequences/[id]/steps — Get all steps for a sequence.
 * POST /api/sequences/[id]/steps — Add a new step to a sequence.
 * PUT /api/sequences/[id]/steps — Reorder steps.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import {
  getSequenceWithSteps,
  addSequenceStep,
  reorderSequenceSteps,
} from "@/lib/sequences/follow-up-engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  try {
    const result = await getSequenceWithSteps(id, workspaceId);
    if (!result) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }
    return NextResponse.json({ steps: result.steps });
  } catch (error) {
    console.error("[Sequences] Error fetching steps:", error);
    return NextResponse.json(
      { error: "Failed to fetch steps" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = session.workspaceId;
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  let body: {
    channel: "sms" | "email" | "call";
    delay_minutes?: number;
    template_content?: string;
    conditions?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { channel, delay_minutes = 0, template_content, conditions } = body;

  if (!["sms", "email", "call"].includes(channel)) {
    return NextResponse.json(
      { error: "Invalid channel (must be sms, email, or call)" },
      { status: 400 }
    );
  }

  try {
    // Verify sequence exists and belongs to workspace
    const result = await getSequenceWithSteps(id, workspaceId);
    if (!result) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    // Get next step order
    const nextStepOrder = (result.steps?.length ?? 0) + 1;

    const step = await addSequenceStep(
      id,
      nextStepOrder,
      channel,
      delay_minutes,
      template_content,
      conditions && typeof conditions === "object" ? conditions : {}
    );

    if (!step) {
      return NextResponse.json(
        { error: "Failed to add step" },
        { status: 500 }
      );
    }

    return NextResponse.json({ step }, { status: 201 });
  } catch (error) {
    console.error("[Sequences] Error adding step:", error);
    return NextResponse.json(
      { error: "Failed to add step" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = session.workspaceId;
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  let body: { step_ids: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { step_ids } = body;

  if (!Array.isArray(step_ids) || step_ids.length === 0) {
    return NextResponse.json(
      { error: "step_ids must be a non-empty array" },
      { status: 400 }
    );
  }

  try {
    // Verify sequence exists and belongs to workspace
    const result = await getSequenceWithSteps(id, workspaceId);
    if (!result) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    // Verify all steps belong to this sequence
    const db = getDb();
    const { data: steps } = await db
      .from("sequence_steps")
      .select("id")
      .eq("sequence_id", id)
      .in("id", step_ids);

    if (!steps || steps.length !== step_ids.length) {
      return NextResponse.json(
        { error: "Some steps not found in this sequence" },
        { status: 400 }
      );
    }

    const success = await reorderSequenceSteps(step_ids);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to reorder steps" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Sequences] Error reordering steps:", error);
    return NextResponse.json(
      { error: "Failed to reorder steps" },
      { status: 500 }
    );
  }
}
