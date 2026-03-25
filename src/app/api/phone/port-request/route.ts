import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;


  try {
    const session = await getSession(req);
    if (!session?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authErr = await requireWorkspaceAccess(req, session.workspaceId);
    if (authErr) return authErr;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      phone_number,
      current_carrier,
      account_number,
      account_pin,
      loa_url,
      contact_name,
      contact_email,
    } = body as {
      phone_number?: string;
      current_carrier?: string;
      account_number?: string;
      account_pin?: string;
      loa_url?: string;
      contact_name?: string;
      contact_email?: string;
    };

    if (!phone_number || !current_carrier) {
      return NextResponse.json({ error: "Phone number and carrier required" }, { status: 400 });
    }

    const db = getDb();
    const { data, error } = await db
      .from("port_requests")
      .insert({
        workspace_id: session.workspaceId,
        phone_number,
        current_carrier,
        account_number: account_number || null,
        account_pin: account_pin || null,
        loa_url: loa_url || null,
        contact_name: contact_name || null,
        contact_email: contact_email || null,
        status: "pending",
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("[port-request] DB error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[port-request] Unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

