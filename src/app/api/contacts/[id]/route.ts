/**
 * GET: fetch one contact (lead). PATCH: update contact.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

const updateContactSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().min(7).max(20).optional(),
  email: z.string().email().max(320).optional().or(z.literal("").transform(() => undefined)),
  company: z.string().max(255).optional(),
  status: z.enum(["new", "contacted", "qualified", "appointment_set", "won", "lost"]).optional(),
}).strict();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const { data: contact, error } = await db.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const err = await requireWorkspaceAccess(req, (contact as { workspace_id: string }).workspace_id);
  if (err) return err;
  return NextResponse.json(contact);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const { data: existing } = await db.from("leads").select("workspace_id").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const err = await requireWorkspaceAccess(req, (existing as { workspace_id: string }).workspace_id);
  if (err) return err;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateContactSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) updates[k] = v;
  }

  const { data: contact, error } = await db.from("leads").update(updates).eq("id", id).select().maybeSingle();
  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  return NextResponse.json(contact);
}
