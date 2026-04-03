import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

async function signPayload(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const { id } = await params;
  const err = await requireWorkspaceAccess(req, id);
  if (err) return err;

  const db = getDb();
  const { data: config } = await db
    .from("webhook_configs")
    .select("endpoint_url, secret, enabled")
    .eq("workspace_id", id)
    .maybeSingle();

  const row = config as { endpoint_url?: string; secret?: string | null; enabled?: boolean } | null;
  if (!row?.endpoint_url?.trim()) {
    return NextResponse.json({ error: "Save a webhook URL first." }, { status: 400 });
  }

  const body = JSON.stringify({
    event: "lead_qualified",
    test: true,
    payload: {
      workspace_id: id,
      lead_name: "Test caller",
      note: "This is a Revenue Operator test delivery.",
    },
    timestamp: new Date().toISOString(),
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Event-Type": "lead_qualified",
    "X-Revenue-Operator-Test": "true",
  };

  if (row.secret) {
    headers["X-Operator-Signature"] = await signPayload(body, row.secret);
  }

  try {
    const res = await fetch(row.endpoint_url, { method: "POST", headers, body, signal: AbortSignal.timeout(10_000) });
    const text = await res.text().catch(() => "");
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      response: text.slice(0, 300),
    });
  } catch (error) {
    log("error", "[webhook-config/test] Request failed:", { error: error });
    return NextResponse.json(
      { error: "Webhook test failed" },
      { status: 502 },
    );
  }
}
