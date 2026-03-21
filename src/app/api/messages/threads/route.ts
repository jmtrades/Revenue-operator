/**
 * GET /api/messages/threads — List SMS threads for the current workspace.
 * Returns lead_id, name, phone, last message preview and time for each conversation.
 */

export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authErr = await requireWorkspaceAccess(req, session.workspaceId);
    if (authErr) return authErr;

    const db = getDb();
    const { data: leads } = await db
      .from("leads")
      .select("id, name, phone")
      .eq("workspace_id", session.workspaceId);
    const leadIds = (leads ?? []).map((l: { id: string }) => l.id);
    if (leadIds.length === 0) {
      return NextResponse.json({ threads: [] });
    }

    const { data: convs } = await db
      .from("conversations")
      .select("id, lead_id, updated_at")
      .eq("channel", "sms")
      .in("lead_id", leadIds)
      .order("updated_at", { ascending: false })
      .limit(100);

    const convIds = [...new Set((convs ?? []).map((c: { id: string }) => c.id))];
    if (convIds.length === 0) {
      const threads = (leads ?? []).map((l: { id: string; name: string | null; phone: string | null }) => ({
        lead_id: l.id,
        name: (l.name?.trim() || l.phone?.trim() || "Unknown").slice(0, 200),
        phone: (l.phone?.trim() ?? "").slice(0, 30),
        preview: "No messages yet",
        time: "Now",
      }));
      return NextResponse.json({ threads });
    }

    const { data: lastMsgs } = await db
      .from("messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    const lastByConv = (lastMsgs ?? []).reduce(
      (acc: Record<string, { content: string; created_at: string }>, m: { conversation_id: string; content: string; created_at: string }) => {
        if (!acc[m.conversation_id]) acc[m.conversation_id] = { content: m.content, created_at: m.created_at };
        return acc;
      },
      {}
    );

    const leadMap = (leads ?? []).reduce(
      (acc: Record<string, { name: string | null; phone: string | null }>, l: { id: string; name: string | null; phone: string | null }) => {
        acc[l.id] = { name: l.name, phone: l.phone };
        return acc;
      },
      {} as Record<string, { name: string | null; phone: string | null }>
    );

    const threads = (convs ?? []).map((c: { id: string; lead_id: string; updated_at: string }) => {
      const lead = leadMap[c.lead_id];
      const last = lastByConv[c.id];
      const name = (lead?.name?.trim() || lead?.phone?.trim() || "Unknown").slice(0, 200);
      const phone = (lead?.phone?.trim() ?? "").slice(0, 30);
      let time = "Now";
      if (last?.created_at) {
        const d = new Date(last.created_at);
        const now = new Date();
        if (now.toDateString() === d.toDateString()) {
          time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        } else if (now.getTime() - d.getTime() < 86400 * 1000) {
          time = "Yesterday";
        } else {
          time = d.toLocaleDateString([], { month: "short", day: "numeric" });
        }
      }
      return {
        lead_id: c.lead_id,
        conversation_id: c.id,
        name,
        phone,
        preview: last?.content?.slice(0, 60)?.trim() || "No messages yet",
        time,
      };
    });

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("[messages/threads]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
