export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const { data: conv } = await db.from("conversations").select("id").eq("lead_id", id).limit(1).single();
  if (!conv) return NextResponse.json({ messages: [] });
  const { data: msgs } = await db
    .from("messages")
    .select("role, content, created_at, metadata")
    .eq("conversation_id", (conv as { id: string }).id)
    .order("created_at", { ascending: true });
  return NextResponse.json({ messages: msgs ?? [] });
}
