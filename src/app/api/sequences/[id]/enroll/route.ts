/**
 * POST /api/sequences/[id]/enroll — Enroll a contact into a sequence.
 * Also supports GET to list enrollments for a sequence.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import {
  enrollContact,
  getSequenceWithSteps,
} from "@/lib/sequences/follow-up-engine";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

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
    // Verify sequence exists and belongs to workspace
    const result = await getSequenceWithSteps(id, workspaceId);
    if (!result) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    // Get all enrollments for this sequence
    const db = getDb();
    const { data: enrollments, error } = await db
      .from("sequence_enrollments")
      .select("*")
      .eq("sequence_id", id)
      .eq("workspace_id", workspaceId)
      .order("enrolled_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch enrollments" },
        { status: 500 }
      );
    }

    return NextResponse.json({ enrollments: enrollments ?? [] });
  } catch (error) {
    log("error", "sequences.enrollments_get_error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch enrollments" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = session.workspaceId;
    const err = await requireWorkspaceAccess(req, workspaceId);
    if (err) return err;

    let body: { contact_id?: string; lead_id?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Accept either contact_id (legacy) or lead_id
    const contact_id = body.lead_id || body.contact_id;

    if (!contact_id?.trim()) {
      return NextResponse.json({ error: "contact_id or lead_id required" }, { status: 400 });
    }

    // Verify sequence exists and belongs to workspace
    const result = await getSequenceWithSteps(id, workspaceId);
    if (!result) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    if (!result.steps || result.steps.length === 0) {
      return NextResponse.json(
        { error: "Sequence has no steps" },
        { status: 400 }
      );
    }

    // Verify contact exists and check workspace communication/agent mode constraints
    const db = getDb();
    const { data: contact } = await db
      .from("leads")
      .select("id")
      .eq("id", contact_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Check workspace communication_mode and agent_mode constraints
    const { data: ws, error: wsError } = await db
      .from("workspaces")
      .select("communication_mode, agent_mode")
      .eq("id", workspaceId)
      .maybeSingle();

    if (wsError) {
      return NextResponse.json({ error: "Could not process sequence. Please try again." }, { status: 500 });
    }

    if (ws) {
      const workspace = ws as { communication_mode?: string | null; agent_mode?: string | null };

      // Check communication_mode constraints
      if (workspace.communication_mode === "texts_only") {
        const hasCallSteps = result.steps.some((s) => s.type === "call");
        if (hasCallSteps) {
          return NextResponse.json(
            { error: "Cannot enroll contact in sequence with call steps: workspace is in text-only mode. Update communication settings to allow calls." },
            { status: 400 }
          );
        }
      } else if (workspace.communication_mode === "calls_only") {
        const hasSmsSteps = result.steps.some((s) => s.type === "sms");
        if (hasSmsSteps) {
          return NextResponse.json(
            { error: "Cannot enroll contact in sequence with SMS steps: workspace is in calls-only mode. Update communication settings to allow texts." },
            { status: 400 }
          );
        }
      }

      // Check agent_mode constraint - inbound_only cannot do outbound sequences
      if (workspace.agent_mode === "inbound_only") {
        return NextResponse.json(
          { error: "Cannot enroll contact in outbound sequence: workspace is configured for inbound calls only. Update agent settings to allow outbound sequences." },
          { status: 400 }
        );
      }
    }

    // Check if contact is already enrolled in this sequence
    const { data: existingEnrollment, error: enrollmentCheckErr } = await db
      .from("sequence_enrollments")
      .select("id")
      .eq("sequence_id", id)
      .eq("contact_id", contact_id)
      .in("status", ["active", "paused"])
      .maybeSingle();

    if (enrollmentCheckErr) {
      log("error", "sequences.enroll_check_error", { error: enrollmentCheckErr.message ?? String(enrollmentCheckErr) });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    if (existingEnrollment) {
      return NextResponse.json(
        { error: "Contact already enrolled in this sequence" },
        { status: 400 }
      );
    }

    // Enroll contact
    const enrollment = await enrollContact(workspaceId, id, contact_id);

    if (!enrollment) {
      return NextResponse.json(
        { error: "Failed to enroll contact" },
        { status: 500 }
      );
    }

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    log("error", "sequences.enroll_post_error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
