import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

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
    console.error("[workspaces/[id]/business-context GET]", error);
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
  const { id } = await params;
  const authErr = await requireWorkspaceAccess(req, id);
  if (authErr) return authErr;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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
    console.error("[workspaces/[id]/business-context PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}
