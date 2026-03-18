/**
 * Voice Consents API
 * GET: Get consent records for workspace
 * POST: Record new consent
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function GET(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const db = getDb();

    // Get optional filters
    const phone = req.nextUrl.searchParams.get("phone");
    const leadId = req.nextUrl.searchParams.get("lead_id");

    let query = db
      .from("voice_consents")
      .select("id, phone, lead_id, consent_type, consent_given, consent_method, consent_text, recorded_at, expires_at, revoked_at, ip_address, metadata")
      .eq("workspace_id", workspaceId);

    if (phone) {
      query = query.eq("phone", phone);
    }
    if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    const { data: consents, error } = await query.order("recorded_at", { ascending: false }).limit(500);

    if (error) {
      console.error("[API] voice consents GET error:", error);
      return NextResponse.json({ error: "Failed to fetch consent records" }, { status: 500 });
    }

    return NextResponse.json({ consents: consents ?? [] });
  } catch (error) {
    console.error("[API] voice consents GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspaceId = req.nextUrl.searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    }

    const authErr = await requireWorkspaceAccess(req, workspaceId);
    if (authErr) return authErr;

    const body = await req.json();
    const { phone, lead_id, consent_type, consent_given, consent_method, consent_text, ip_address, expires_at, metadata } = body;

    if (!phone || !consent_type) {
      return NextResponse.json({ error: "phone and consent_type are required" }, { status: 400 });
    }

    const validConsentTypes = ["recording", "ai_voice", "voice_clone", "sms"];
    if (!validConsentTypes.includes(consent_type)) {
      return NextResponse.json({ error: `Invalid consent_type. Must be one of: ${validConsentTypes.join(", ")}` }, { status: 400 });
    }

    const db = getDb();

    const { data: consent, error: insertError } = await db
      .from("voice_consents")
      .insert([
        {
          workspace_id: workspaceId,
          phone,
          lead_id: lead_id ?? null,
          consent_type,
          consent_given: consent_given ?? true,
          consent_method: consent_method ?? null,
          consent_text: consent_text ?? null,
          ip_address: ip_address ?? null,
          expires_at: expires_at ?? null,
          metadata: metadata ?? {},
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("[API] voice consents POST error:", insertError);
      return NextResponse.json({ error: "Failed to record consent" }, { status: 500 });
    }

    return NextResponse.json({ id: consent.id }, { status: 201 });
  } catch (error) {
    console.error("[API] voice consents POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
