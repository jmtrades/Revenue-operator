export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { parseBody, emailSchema, phoneSchema, workspaceIdSchema } from "@/lib/api/validate";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizePhoneE164 } from "@/lib/phone/normalize";

const GENERIC_ERROR = "An unexpected error occurred";

async function getContacts(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;
  const db = getDb();
  const { data, error } = await db
    .from("leads")
    .select("id, workspace_id, name, phone, email, company, state, last_activity_at, created_at, source, channel, metadata")
    .eq("workspace_id", workspaceId)
    .order("last_activity_at", { ascending: false, nullsFirst: false });
  if (error) {
    console.error("[API Error] contacts GET:", error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
  return NextResponse.json({ contacts: data ?? [] });
}

const createContactSchema = z.object({
  workspace_id: workspaceIdSchema,
  name: z.string().min(1, "Name required").max(255),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  company: z.string().max(255).optional(),
});

async function postContact(req: NextRequest) {
  const parsed = await parseBody(req, createContactSchema);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;
  const { workspace_id, name, phone, email, company } = body;
  const err = await requireWorkspaceAccess(req, workspace_id);
  if (err) return err;

  const rl = await checkRateLimit(`contacts_create:${workspace_id}`, 50, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }
  const db = getDb();
  const { data: contact, error } = await db
    .from("leads")
    .insert({ workspace_id, name, phone: phone ? normalizePhoneE164(phone) : null, email: email ?? null, company: company ?? null, status: "NEW" })
    .select()
    .maybeSingle();
  if (error) {
    console.error("[API Error] contacts POST:", error);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
  return NextResponse.json(contact);
}

export async function GET(req: NextRequest) {
  try {
    return await getContacts(req);
  } catch (err) {
    console.error(`[API Error] GET ${req.url}:`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    return await postContact(req);
  } catch (err) {
    console.error(`[API Error] POST ${req.url}:`, err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
