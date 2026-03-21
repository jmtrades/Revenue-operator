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
    console.error("[Sequences] Error fetching enrollments:", error);
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
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = session.workspaceId;
    const err = await requireWorkspaceAccess(req, workspaceId);
    if (err) return err;

    let body: { contact_id: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { contact_id } = body;

    if (!contact_id?.trim()) {
      return NextResponse.json({ error: "contact_id required" }, { status: 400 });
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

    // Verify contact exists
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

    // Check if contact is already enrolled in this sequence
    const { data: existingEnrollment, error: enrollmentCheckErr } = await db
      .from("sequence_enrollments")
      .select("id")
      .eq("sequence_id", id)
      .eq("contact_id", contact_id)
      .in("status", ["active", "paused"])
      .maybeSingle();

    if (enrollmentCheckErr) {
      console.error("[sequences/[id]/enroll POST enrollment check]", enrollmentCheckErr);
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
    console.error("[sequences/[id]/enroll POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
