/**
 * GET /api/sequences/[id] — Get a single sequence with all its steps.
 * PATCH /api/sequences/[id] — Update a sequence.
 * DELETE /api/sequences/[id] — Delete a sequence.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import {
  getSequenceWithSteps,
  updateSequence,
  deleteSequence,
} from "@/lib/sequences/follow-up-engine";
import { assertSameOrigin } from "@/lib/http/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

const updateSequenceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  trigger_type: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
}).strict();

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
    return NextResponse.json(result);
  } catch (error) {
    log("error", "[Sequences] Error fetching sequence:", { error: error });
    return NextResponse.json(
      { error: "Failed to fetch sequence" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const { id } = await params;
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = session.workspaceId;
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateSequenceSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const sequence = await updateSequence(id, workspaceId, parsed.data);
    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }
    return NextResponse.json({ sequence });
  } catch (error) {
    log("error", "[Sequences] Error updating sequence:", { error: error });
    return NextResponse.json(
      { error: "Failed to update sequence" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const { id } = await params;
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = session.workspaceId;
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  // Rate limit: 10 sequence deletes per minute per workspace
  const rl = await checkRateLimit(`sequences_delete:${workspaceId}`, 10, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many delete requests. Please slow down." }, { status: 429 });
  }

  try {
    const success = await deleteSequence(id, workspaceId);
    if (!success) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    log("error", "[Sequences] Error deleting sequence:", { error: error });
    return NextResponse.json(
      { error: "Failed to delete sequence" },
      { status: 500 }
    );
  }
}
import { log } from "@/lib/logger";
