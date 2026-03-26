import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;


  const session = await getSession(req);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

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

