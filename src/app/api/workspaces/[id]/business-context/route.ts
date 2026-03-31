import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authErr = await requireWorkspaceAccess(req, id);
  if (authErr) return authErr;
  const db = getDb();
  const { data, error } = await db
    .from("workspace_business_context")
    .select("*")
    .eq("workspace_id", id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    log("error", "[workspaces/[id]/business-context GET]", { error: error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Return defaults if not found
  return NextResponse.json(data ?? {
    business_name: "",
    offer_summary: "",
    ideal_customer: "",
    disqualifiers: "",
    pricing_range: null,
    booking_link: null,
    faq: [],
    tone_guidelines: { style: "calm", formality: "professional" },
    compliance_notes: [],
    timezone: "UTC",
    business_hours: {
      monday: { start: "09:00", end: "17:00" },
      tuesday: { start: "09:00", end: "17:00" },
      wednesday: { start: "09:00", end: "17:00" },
      thursday: { start: "09:00", end: "17:00" },
      friday: { start: "09:00", end: "17:00" },
    },
    negotiation_rules: {
      discounts_allowed: false,
      deposit_required: false,
      payment_terms: null,
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;
  const { id } = await params;
  const authErr = await requireWorkspaceAccess(req, id);
  if (authErr) return authErr;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Prevent oversized payloads from being stored in JSONB columns
  const bodySize = JSON.stringify(body).length;
  if (bodySize > 64_000) {
    return NextResponse.json({ error: "Payload too large (max 64KB)" }, { status: 413 });
  }

  const db = getDb();
  const { data, error } = await db
    .from("workspace_business_context")
    .upsert(
      {
        workspace_id: id,
        ...body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    )
    .select()
    .maybeSingle();

  if (error) {
    log("error", "[workspaces/[id]/business-context PUT]", { error: error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}
