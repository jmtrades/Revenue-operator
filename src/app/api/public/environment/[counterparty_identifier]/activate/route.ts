/**
 * POST /api/public/environment/[counterparty_identifier]/activate
 * Token-gated. Inserts counterparty_identities when identifier resolves to a workspace owner.
 * No auth; valid token from shared_transaction_tokens required. Does not reveal workspace ids on failure.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { validateTokenAndGetTransactionId } from "@/lib/shared-transaction-assurance";

/** Resolve identifier (email/phone) to workspace_id whose owner matches. Returns null if not resolvable. */
async function resolveCounterpartyToWorkspace(identifier: string): Promise<string | null> {
  const db = getDb();
  const idn = identifier.trim().toLowerCase();
  if (!idn) return null;
  const isEmail = idn.includes("@");
  const identifierType = isEmail ? "email" : idn.replace(/\D/g, "").length >= 10 ? "phone" : "other";
  const { data: existing } = await db
    .from("counterparty_identities")
    .select("workspace_id")
    .eq("identifier_type", identifierType)
    .eq("identifier", idn)
    .maybeSingle();
  if (existing) return (existing as { workspace_id: string }).workspace_id;
  if (!isEmail) return null;
  const { data: user } = await db.from("users").select("id").eq("email", idn).maybeSingle();
  if (!user) return null;
  const userId = (user as { id: string }).id;
  const { data: ws } = await db.from("workspaces").select("id").eq("owner_id", userId).maybeSingle();
  if (!ws) return null;
  return (ws as { id: string }).id;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ counterparty_identifier: string }> }
) {
  const { counterparty_identifier } = await params;
  const raw = counterparty_identifier ? decodeURIComponent(counterparty_identifier) : "";
  if (!raw) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let body: { token?: string };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const token = (body.token ?? request.nextUrl.searchParams.get("token") ?? "").trim();
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const result = await validateTokenAndGetTransactionId(token);
  if (!result || "alreadyUsed" in result) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  const transactionId = result.transactionId;
  const db = getDb();
  const { data: tx } = await db
    .from("shared_transactions")
    .select("counterparty_identifier")
    .eq("id", transactionId)
    .single();
  if (!tx) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  const txCounterparty = (tx as { counterparty_identifier: string }).counterparty_identifier;
  if (txCounterparty.trim().toLowerCase() !== raw.trim().toLowerCase()) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const workspaceId = await resolveCounterpartyToWorkspace(raw);
  if (!workspaceId) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const idn = raw.trim().toLowerCase();
  const identifierType = idn.includes("@") ? "email" : idn.replace(/\D/g, "").length >= 10 ? "phone" : "other";
  await db.from("counterparty_identities").upsert(
    {
      workspace_id: workspaceId,
      identifier: idn,
      identifier_type: identifierType,
      created_at: new Date().toISOString(),
    },
    { onConflict: "identifier_type,identifier", ignoreDuplicates: true }
  );

  const { markTokenUsed } = await import("@/lib/shared-transaction-assurance");
  await markTokenUsed(token);

  return NextResponse.json({ ok: true }, { status: 200 });
}

/** GET with token in query: same activation logic for link-from-message. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ counterparty_identifier: string }> }
) {
  const { counterparty_identifier } = await params;
  const raw = counterparty_identifier ? decodeURIComponent(counterparty_identifier) : "";
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!raw || !token) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const result = await validateTokenAndGetTransactionId(token);
  if (!result || "alreadyUsed" in result) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  const transactionId = result.transactionId;
  const db = getDb();
  const { data: tx } = await db
    .from("shared_transactions")
    .select("counterparty_identifier")
    .eq("id", transactionId)
    .single();
  if (!tx) return NextResponse.json({ ok: false }, { status: 200 });
  const txCounterparty = (tx as { counterparty_identifier: string }).counterparty_identifier;
  if (txCounterparty.trim().toLowerCase() !== raw.trim().toLowerCase()) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  const workspaceId = await resolveCounterpartyToWorkspace(raw);
  if (!workspaceId) return NextResponse.json({ ok: false }, { status: 200 });
  const idn = raw.trim().toLowerCase();
  const identifierType = idn.includes("@") ? "email" : idn.replace(/\D/g, "").length >= 10 ? "phone" : "other";
  await db.from("counterparty_identities").upsert(
    {
      workspace_id: workspaceId,
      identifier: idn,
      identifier_type: identifierType,
      created_at: new Date().toISOString(),
    },
    { onConflict: "identifier_type,identifier", ignoreDuplicates: true }
  );
  const { markTokenUsed } = await import("@/lib/shared-transaction-assurance");
  await markTokenUsed(token);
  return NextResponse.json({ ok: true }, { status: 200 });
}
