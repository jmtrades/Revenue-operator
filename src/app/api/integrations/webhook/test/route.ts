import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  const session = await getSession(req);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data, error } = await db
    .from("workspaces")
    .select("webhook_url")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load webhook URL" }, { status: 500 });
  }

  const url =
    (data as { webhook_url?: string | null } | null)?.webhook_url?.toString().trim() ??
    "";
  if (!url) {
    return NextResponse.json({ error: "No webhook URL saved" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "test",
        timestamp: new Date().toISOString(),
        data: {
          lead: { name: "Test Lead", phone: "+15551234567" },
          source: "revenue-operator-test",
        },
      }),
    });

    const text = await res.text().catch(() => "");

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: res.status,
          response: text.slice(0, 2000),
          error: "Webhook test failed. Please check the URL and try again.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      status: res.status,
      response: text.slice(0, 2000),
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
    return NextResponse.json(
      { error: `Webhook failed: ${message}` },
      { status: 502 },
    );
  }
}

