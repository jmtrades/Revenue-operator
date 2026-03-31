/**
 * GET /api/inbox?workspace_id= — Threads from messages table for Inbox page.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    // Parse pagination params
    let page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
    let limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);

    // Validate and constrain
    if (page < 1) page = 1;
    if (limit < 1) limit = 50;
    if (limit > 200) limit = 200;

    const offset = (page - 1) * limit;

    const db = getDb();
    // Get total count
    const { count: total } = await db
      .from("messages")
      .select("id", { count: "exact" })
      .eq("workspace_id", workspaceId);

    const { data: messages } = await db
      .from("messages")
      .select("id, lead_id, direction, channel, content, sent_at")
      .eq("workspace_id", workspaceId)
      .order("sent_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (!messages?.length) return NextResponse.json({ threads: [] });

    const leadIds = [...new Set((messages as { lead_id: string }[]).map((m) => m.lead_id))];
    const { data: leads } = await db.from("leads").select("id, name, phone").in("id", leadIds);
    const leadMap = ((leads ?? []) as { id: string; name?: string | null; phone?: string | null }[]).reduce(
      (acc, l) => {
        acc[l.id] = l;
        return acc;
      },
      {} as Record<string, { name?: string | null; phone?: string | null }>
    );

    const byLead = new Map<
      string,
      { messages: { id: string; direction: string; channel: string; content: string; sent_at: string }[] }
    >();
    for (const m of messages as { id: string; lead_id: string; direction: string; channel: string; content: string; sent_at: string }[]) {
      if (!byLead.has(m.lead_id)) byLead.set(m.lead_id, { messages: [] });
      byLead.get(m.lead_id)!.messages.push({
        id: m.id,
        direction: m.direction,
        channel: m.channel,
        content: m.content,
        sent_at: m.sent_at,
      });
    }

    const channelMap: Record<string, "phone" | "sms" | "email" | "whatsapp"> = {
      sms: "sms",
      email: "email",
      phone: "phone",
      whatsapp: "whatsapp",
    };
    const threads = Array.from(byLead.entries()).map(([leadId, { messages: msgs }]) => {
      const lead = leadMap[leadId];
      const last = msgs[0];
      const channel = channelMap[last?.channel ?? "sms"] ?? "sms";
      return {
        id: leadId,
        contactName: lead?.name ?? "Contact",
        contactPhone: lead?.phone ?? "",
        channel,
        lastMessage: last?.content?.slice(0, 80) ?? "",
        lastMessageAt: last?.sent_at ?? new Date().toISOString(),
        unread: false,
        status: "Open" as const,
        messages: msgs.slice(0, 20).map((msg) => ({
          id: msg.id,
          sender: msg.direction === "outbound" ? ("agent" as const) : ("contact" as const),
          content: msg.content,
          timestamp: msg.sent_at,
          channel: channelMap[msg.channel] ?? "sms",
        })),
      };
    });

    threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    return NextResponse.json({ conversations: threads, page, limit, total: total ?? 0 });
  } catch (error) {
    log("error", "[inbox]", { error: error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
