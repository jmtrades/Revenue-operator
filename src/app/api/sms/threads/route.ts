import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authErr = await requireWorkspaceAccess(request, session.workspaceId);
  if (authErr) return authErr;

  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  const threadId = request.nextUrl.searchParams.get("thread_id");
  const offset = parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10), 50);

  if (!workspaceId) return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });

  try {
    const db = getDb();

    // If thread_id is provided, return messages for that thread
    if (threadId) {
      const { data: messages } = await db
        .from("sms_messages")
        .select("id, direction, body, status, from_number, to_number, created_at")
        .eq("workspace_id", workspaceId)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(100);

      return NextResponse.json({ messages: messages ?? [] });
    }

    // Otherwise return thread summaries
    const { data: threads } = await db
      .from("sms_threads")
      .select("id, lead_id, contact_phone, contact_name, last_message, last_message_at, unread_count, status, created_at")
      .eq("workspace_id", workspaceId)
      .order("last_message_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { count } = await db
      .from("sms_threads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    return NextResponse.json({
      threads: threads ?? [],
      total: count ?? 0,
    });
  } catch (err) {
    log("error", "api.sms.threads_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load threads" }, { status: 500 });
  }
}
