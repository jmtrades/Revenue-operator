export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

interface ChatMessage {
  id: string;
  session_id: string;
  message_text: string;
  sender_type: "visitor" | "agent";
  sender_name?: string;
  is_read: boolean;
  created_at: string;
}

/**
 * GET /api/chat-widget/messages?session_id=xxx
 * List messages for a chat session (requires valid session token or workspace auth)
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const sessionToken = req.nextUrl.searchParams.get("session_token");

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id query parameter required" },
      { status: 400 }
    );
  }

  try {
    const db = getDb();

    // Verify access: either valid session token or workspace auth
    const { data: sessionData } = await db
      .from("chat_widget_sessions")
      .select("id, session_token, workspace_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (!sessionData) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if visitor has valid session token OR user has workspace auth
    const isVisitor = sessionToken && sessionData.session_token === sessionToken;
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

    // Mark all unread messages from agent as read (for visitor)
    if (isVisitor && data && data.length > 0) {
      const unreadMessages = (data as ChatMessage[]).filter(
        (m) => m.sender_type === "agent" && !m.is_read
      );
      if (unreadMessages.length > 0) {
        await db
          .from("chat_widget_messages")
          .update({ is_read: true })
          .in("id", unreadMessages.map((m) => m.id));
      }
    }

    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    console.error("[chat-widget/messages GET]", error);
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
  try {
    const body = (await req.json()) as {
      session_id: string;
      session_token?: string;
      message_text: string;
      sender_type: "visitor" | "agent";
      sender_name?: string;
    };

    const { session_id, session_token, message_text, sender_type, sender_name } =
      body;

    if (!session_id || !message_text || !sender_type) {
      return NextResponse.json(
        { error: "session_id, message_text, and sender_type are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify access
    const { data: sessionData } = await db
      .from("chat_widget_sessions")
      .select("id, session_token, workspace_id")
      .eq("id", session_id)
      .maybeSingle();

    if (!sessionData) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const isVisitor = session_token && sessionData.session_token === session_token;
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

    // Insert message
    const { data, error } = await db
      .from("chat_widget_messages")
      .insert({
        session_id,
        message_text,
        sender_type,
        sender_name: sender_name || null,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[chat-widget/messages POST]", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // If this is a visitor message, generate auto-response (in future: use AI)
    if (isVisitor) {
      // TODO: Generate AI auto-response using workspace's knowledge base/agent config
      // For now, we'll just return the message
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[chat-widget/messages POST]", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
