import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { parseBody, workspaceIdSchema, safeStringSchema, dncReasonSchema } from "@/lib/api/validate";
// Phase 78 / Task 7.3 — canonical DNC table is `dnc_entries`; writes go
// through the unified helper. This route still owns GET (list) and DELETE
// (remove by id) because they're dashboard concerns, but POST uses the
// unified `addDncEntry` helper so the reason enum + normalization match
// everywhere else (SMS STOP, in-call revocation, wrong-number, etc.).
import { addDncEntry, type DncReason } from "@/lib/voice/dnc";

const addDncSchema = z.object({
  workspace_id: workspaceIdSchema,
  phone_number: z.string().min(7, "Phone number too short").max(20, "Phone number too long"),
  reason: dncReasonSchema.optional().default("manual"),
  source: safeStringSchema(100).optional().default("dashboard"),
  notes: safeStringSchema(1000).optional(),
  added_by: safeStringSchema(100).optional().default("system"),
});

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  const search = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const reason = request.nextUrl.searchParams.get("reason") ?? undefined;
  const offset = Math.max(0, parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "25", 10) || 25), 100);

  if (!workspaceId) return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });

  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    let query = db
      .from("dnc_entries")
      .select("id, phone_number, reason, source, notes, added_by, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike("phone_number", `%${search}%`);
    }
    if (reason) {
      query = query.eq("reason", reason);
    }

    const { data, error } = await query;

    // Count query
    let countQuery = db
      .from("dnc_entries")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    if (search) countQuery = countQuery.ilike("phone_number", `%${search}%`);
    if (reason) countQuery = countQuery.eq("reason", reason);

    const { count } = await countQuery;

    if (error) throw error;

    return NextResponse.json({
      entries: data ?? [],
      total: count ?? 0,
    });
  } catch (err) {
    log("error", "api.dnc.list_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to list DNC entries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  try {
    const parsed = await parseBody(request, addDncSchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;

    const authErr = await requireWorkspaceAccess(request, body.workspace_id);
    if (authErr) return authErr;

    const db = getDb();

    // Delegate insertion + normalization to the unified helper. It enforces
    // strict E.164, writes to `dnc_entries(phone_number)`, and upserts on
    // conflict (workspace_id,phone_number) — matching SMS STOP and in-call
    // revocation paths.
    const allowedReasons = new Set<DncReason>([
      "user_request",
      "stop_keyword",
      "ftc_registry",
      "complaint",
      "manual",
      "consent_revoked",
      "wrong_number",
      "reassigned_number",
    ]);
    const reason: DncReason = allowedReasons.has(body.reason as DncReason)
      ? (body.reason as DncReason)
      : "manual";

    const result = await addDncEntry({
      workspaceId: body.workspace_id,
      phone: body.phone_number,
      reason,
      source: body.source || "dashboard",
      notes: body.notes ?? null,
      addedBy: body.added_by || "system",
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Failed to add DNC entry" },
        { status: 400 },
      );
    }

    // Read back the canonical row for the response (id + created_at fields
    // the dashboard expects).
    const { data } = await db
      .from("dnc_entries")
      .select("id, phone_number, reason, source, notes, added_by, created_at")
      .eq("workspace_id", body.workspace_id)
      .eq("id", result.id ?? "")
      .maybeSingle();

    log("info", "api.dnc.added", { reason: body.reason });
    return NextResponse.json({ entry: data }, { status: 201 });
  } catch (err) {
    log("error", "api.dnc.add_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to add DNC entry" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  const entryId = request.nextUrl.searchParams.get("id");
  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!entryId) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!workspaceId) return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });

  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  try {
    const db = getDb();
    await db.from("dnc_entries").delete().eq("id", entryId).eq("workspace_id", workspaceId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log("error", "api.dnc.delete_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to remove DNC entry" }, { status: 500 });
  }
}
