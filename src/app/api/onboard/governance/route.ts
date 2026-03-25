/**
 * POST /api/onboard/governance — set jurisdiction, approval mode, and initialize execution governance.
 * Deterministic, idempotent. When session is enabled, requires workspace access. Returns { ok: true } or { ok: false, reason }.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

const JURISDICTIONS = ["UK", "US-CA", "US-NY", "US-TX", "US-FL", "EU-GDPR"] as const;
const APPROVAL_MODES = ["autopilot", "preview_required", "approval_required", "locked_script", "jurisdiction_locked"] as const;
const ALLOWED_DOMAIN_TYPES = ["general", "real_estate", "clinic", "finance", "recruiting", "home_services"] as const;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { workspace_id?: string; jurisdiction?: string; approval_mode?: string; domain_type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id.trim() : "";
  if (!workspaceId) {
    return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const jurisdiction =
    body.jurisdiction && JURISDICTIONS.includes(body.jurisdiction as (typeof JURISDICTIONS)[number])
      ? body.jurisdiction
      : "UK";
  const approvalMode =
    body.approval_mode && APPROVAL_MODES.includes(body.approval_mode as (typeof APPROVAL_MODES)[number])
      ? body.approval_mode
      : "autopilot";
  const domainType =
    body.domain_type && ALLOWED_DOMAIN_TYPES.includes(body.domain_type as (typeof ALLOWED_DOMAIN_TYPES)[number])
      ? body.domain_type === "generic"
        ? "general"
        : body.domain_type
      : "general";

  try {
    const db = getDb();

    const { data: pack } = await db
      .from("domain_packs")
      .select("id, domain_type, config_json")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const resolvedDomainType = (pack as { domain_type?: string } | null)?.domain_type ?? domainType;
    const existingConfig = (pack as { config_json?: Record<string, unknown> } | null)?.config_json ?? {};

    await db.from("domain_packs").upsert(
      {
        workspace_id: workspaceId,
        domain_type: resolvedDomainType,
        config_json: { ...existingConfig, default_jurisdiction: jurisdiction },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,domain_type" }
    );

    await db
      .from("message_policies")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("domain_type", resolvedDomainType)
      .eq("jurisdiction", jurisdiction)
      .eq("channel", "sms")
      .eq("intent_type", "follow_up");

    await db.from("message_policies").insert({
      workspace_id: workspaceId,
      domain_type: resolvedDomainType,
      jurisdiction,
      channel: "sms",
      intent_type: "follow_up",
      approval_mode: approvalMode,
      required_disclaimers: [],
      forbidden_phrases: [],
      required_phrases: [],
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
}
