import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string | null };
  try {
    body = (await req.json()) as { url?: string | null };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = (body.url ?? "").toString().trim();
  if (!url || !url.startsWith("http")) {
    return NextResponse.json(
      { error: "Enter a valid URL starting with http" },
      { status: 400 },
    );
  }

  const db = getDb();
  const { error } = await db
    .from("workspaces")
    .update({ webhook_url: url, updated_at: new Date().toISOString() })
    .eq("id", workspaceId);

  if (error) {
    return NextResponse.json({ error: "Failed to save webhook URL" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

