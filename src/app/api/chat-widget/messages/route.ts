export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

interface _ChatMessage {
  id: string;
  session_id: string;
  workspace_id: string;
  sender_type: "visitor" | "agent";
  content: string;
  created_at: string;
  channel?: string;
  metadata?: Record<string, unknown> | null;
}

/**
 * GET /api/chat-widget/messages?session_id=xxx
 * List messages for a chat session (requires valid visitor_token or workspace auth)
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const visitorToken = req.nextUrl.searchParams.get("session_token") || req.nextUrl.searchParams.get("visitor_token");

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id query parameter required" },
      { status: 400 }
    );
  }

  try {
    const db = getDb();

    // Verify access: either valid visitor token or workspace auth
    const { data: sessionData } = await db
      .from("chat_widget_sessions")
      .select("id, visitor_token, workspace_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (!sessionData) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if visitor has valid token OR user has workspace auth
    const isVisitor = visitorToken && sessionData.visitor_token === visitorToken;
    const isAgent = await (async () => {
      const session = await getSession(req);
      if (!session?.workspaceId) return false;
      return session.workspaceId === sessionData.workspace_id;
    })();

    if (!isVisitor && !isAgent) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch messages
    const { data } = await db
      .from("chat_widget_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    log("error", "[chat-widget/messages GET]", { error: error });
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat-widget/messages
 * Send a message (from visitor or agent)
 */
export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  // Rate limit: 30 messages per minute per IP
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`chat-widget-msg:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many messages. Please slow down." },
      { status: 429 }
    );
  }

  try {
    const body = (await req.json()) as {
      session_id: string;
      session_token?: string;
      visitor_token?: string;
      content?: string;
      message_text?: string; // backwards compat
      sender_type: "visitor" | "agent";
    };

    const { session_id, sender_type } = body;
    // Accept both 'content' and 'message_text' for backwards compatibility
    const rawContent = body.content ?? body.message_text;
    const visitorToken = body.visitor_token ?? body.session_token;

    if (!session_id || !rawContent?.trim() || !sender_type) {
      return NextResponse.json(
        { error: "session_id, content, and sender_type are required" },
        { status: 400 }
      );
    }

    // Enforce message length limit (5000 chars max)
    const trimmedContent = rawContent.trim().slice(0, 5000);

    if (!["visitor", "agent"].includes(sender_type)) {
      return NextResponse.json(
        { error: "sender_type must be 'visitor' or 'agent'" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify access
    const { data: sessionData } = await db
      .from("chat_widget_sessions")
      .select("id, visitor_token, workspace_id")
      .eq("id", session_id)
      .maybeSingle();

    if (!sessionData) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const isVisitor = visitorToken && sessionData.visitor_token === visitorToken;
    const isAgent = await (async () => {
      const session = await getSession(req);
      if (!session?.workspaceId) return false;
      return session.workspaceId === sessionData.workspace_id;
    })();

    if (!isVisitor && !isAgent) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate sender type
    if (isVisitor && sender_type !== "visitor") {
      return NextResponse.json(
        { error: "Visitors can only send visitor messages" },
        { status: 403 }
      );
    }

    if (isAgent && sender_type !== "agent") {
      return NextResponse.json(
        { error: "Agents can only send agent messages" },
        { status: 403 }
      );
    }

    // Insert message — actual columns: session_id, workspace_id, sender_type, content, channel, metadata
    const { data, error } = await db
      .from("chat_widget_messages")
      .insert({
        session_id,
        workspace_id: sessionData.workspace_id,
        sender_type,
        content: trimmedContent,
        channel: "web",
      })
      .select()
      .single();

    if (error) {
      log("error", "[chat-widget/messages POST]", { error: error });
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Update unread count on session if visitor message
    if (isVisitor) {
      try {
        const { data: sess } = await db
          .from("chat_widget_sessions")
          .select("unread_count")
          .eq("id", session_id)
          .maybeSingle();
        const currentCount = (sess as { unread_count?: number })?.unread_count ?? 0;
        await db
          .from("chat_widget_sessions")
          .update({ unread_count: currentCount + 1, updated_at: new Date().toISOString() })
          .eq("id", session_id);
      } catch { /* non-critical */ }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    log("error", "[chat-widget/messages POST]", { error: error });
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
