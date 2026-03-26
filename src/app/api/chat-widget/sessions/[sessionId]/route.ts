export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";

/**
 * PATCH /api/chat-widget/sessions/[sessionId]
 * Update chat session status (requires workspace auth)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const { sessionId } = await params;

  try {
    const body = (await req.json()) as { status: string };
    const { status } = body;

    if (!status || !["active", "resolved"].includes(status)) {
      return NextResponse.json(
        { error: "Valid status required (active or resolved)" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify the session belongs to this workspace
    const { data: sessionData } = await db
      .from("chat_widget_sessions")
      .select("workspace_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (!sessionData) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if ((sessionData as { workspace_id: string }).workspace_id !== session.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Update session
    const updatePayload =
      status === "resolved"
        ? { status, resolved_at: new Date().toISOString() }
        : { status };

    const { data, error } = await db
      .from("chat_widget_sessions")
      .update(updatePayload)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      console.error("[chat-widget/sessions PATCH]", error);
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[chat-widget/sessions PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}
