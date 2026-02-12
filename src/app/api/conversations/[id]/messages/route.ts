/**
 * Get messages for a conversation
 * Used by live page to show real conversation timeline
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  // Get conversation (id can be conversation id or lead id)
  let conversationId: string | null = null;
  
  // Try as conversation id first
  const { data: convById } = await db
    .from("conversations")
    .select("id, lead_id, workspace_id")
    .eq("id", id)
    .eq("workspace_id", session.workspaceId)
    .single();
  
  if (convById) {
    conversationId = (convById as { id: string }).id;
  } else {
    // Try as lead id
    const { data: convByLead } = await db
      .from("conversations")
      .select("id, lead_id, workspace_id")
      .eq("lead_id", id)
      .eq("workspace_id", session.workspaceId)
      .limit(1)
      .single();
    
    if (convByLead) {
      conversationId = (convByLead as { id: string }).id;
    }
  }

  if (!conversationId) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Get messages
  const { data: messages } = await db
    .from("messages")
    .select("id, role, content, created_at, metadata")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    conversation_id: conversationId,
    messages: (messages ?? []).map((m) => ({
      id: (m as { id: string }).id,
      role: (m as { role: string }).role,
      content: (m as { content: string }).content,
      created_at: (m as { created_at: string }).created_at,
      conversation_state: (m as { metadata?: { conversation_state?: string } }).metadata?.conversation_state,
    })),
  });
}
