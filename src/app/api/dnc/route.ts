import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { parseBody, workspaceIdSchema, safeStringSchema, dncReasonSchema } from "@/lib/api/validate";

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
      .from("dnc_list")
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
      .from("dnc_list")
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

    // Normalize phone number - strip non-digit chars except leading +
    const normalized = body.phone_number.startsWith("+")
      ? "+" + body.phone_number.slice(1).replace(/\D/g, "")
      : body.phone_number.replace(/\D/g, "");

    const db = getDb();

    // Check if already on DNC
    const { data: existing } = await db
      .from("dnc_list")
      .select("id")
      .eq("workspace_id", body.workspace_id)
      .eq("phone_number", normalized)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Phone number already on DNC list", existing_id: existing.id }, { status: 409 });
    }

    const { data, error } = await db
      .from("dnc_list")
      .insert({
        workspace_id: body.workspace_id,
        phone_number: normalized,
        reason: body.reason || "manual",
        source: body.source || "dashboard",
        notes: body.notes || null,
        added_by: body.added_by || "system",
      })
      .select()
      .single();

    if (error) throw error;

    log("info", "api.dnc.added", { phone: normalized, reason: body.reason });
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
    await db.from("dnc_list").delete().eq("id", entryId).eq("workspace_id", workspaceId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log("error", "api.dnc.delete_failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to remove DNC entry" }, { status: 500 });
  }
}
