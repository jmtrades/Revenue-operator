/**
 * POST /api/activate/execution
 * Zero-friction execution activation: industry, jurisdiction, review level.
 * Deterministic, append-only configuration. Returns { ok, reason? } with status 200.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { validateDomainPackForActivation } from "@/lib/domain-packs/validate-activation";
import { resolveDomainPackConfig } from "@/lib/domain-packs/resolve";
import { resolveCompliancePack } from "@/lib/governance/compliance-pack";
import { getEnterpriseImmutabilityConfig } from "@/lib/enterprise/immutability";

const INDUSTRY_TO_DOMAIN: Record<string, string> = {
  general: "general",
  real_estate: "real_estate",
  clinic: "clinic",
  finance: "finance",
  recruiting: "recruiting",
  home_services: "home_services",
};

const REVIEW_LEVEL_TO_APPROVAL: Record<string, string> = {
  review_all: "approval_required",
  preview_then_operate: "preview_required",
  operate_within_governance: "autopilot",
};

type Body = {
  workspace_id?: string;
  industry_type?: string;
  jurisdiction?: string;
  review_level?: "review_all" | "preview_then_operate" | "operate_within_governance";
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const workspaceId = typeof body.workspace_id === "string" ? body.workspace_id.trim() : "";
  if (!workspaceId) {
    return NextResponse.json({ ok: false, reason: "invalid_input" }, { status: 400 });
  }

  const authErr = await requireWorkspaceRole(req, workspaceId, ["owner", "admin", "operator"]);
  if (authErr) return authErr;

  const industryRaw = (body.industry_type ?? "").trim() || "general";
  const jurisdiction = (body.jurisdiction ?? "").trim() || "UNSPECIFIED";
  const reviewLevel = (body.review_level ?? "preview_then_operate") as Body["review_level"];

  const domainType = INDUSTRY_TO_DOMAIN[industryRaw] ?? "general";
  const approvalMode = REVIEW_LEVEL_TO_APPROVAL[reviewLevel ?? "preview_then_operate"] ?? "preview_required";

  try {
    const db = getDb();

    // Upsert domain pack with default jurisdiction.
    const { data: existingPack } = await db
      .from("domain_packs")
      .select("config_json")
      .eq("workspace_id", workspaceId)
      .eq("domain_type", domainType)
      .maybeSingle();

    const existingConfig = (existingPack as { config_json?: Record<string, unknown> } | null)?.config_json ?? {};

    await db
      .from("domain_packs")
      .upsert(
        {
          workspace_id: workspaceId,
          domain_type: domainType,
          config_json: { ...existingConfig, default_jurisdiction: jurisdiction },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,domain_type" }
      );

    // Set workspace-level approval_mode (review level).
    await db
      .from("settings")
      .update({ approval_mode: approvalMode, updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId);

    // Validate domain pack completeness before allowing execution.
    const validation = await validateDomainPackForActivation(workspaceId);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, reason: "domain_pack_incomplete" }, { status: 422 });
    }

    // Enterprise immutability: fail-fast activation when configuration is incomplete.
    const immutability = await getEnterpriseImmutabilityConfig(workspaceId);
    if (immutability.isEnterprise || immutability.immutabilityLock || immutability.jurisdictionLocked) {
      const packConfig = await resolveDomainPackConfig(workspaceId);
      const defaultJurisdiction = packConfig?.default_jurisdiction ?? jurisdiction;

      const compliance = await resolveCompliancePack(workspaceId, domainType);
      const complianceIncomplete =
        compliance.disclaimers.length === 0 ||
        !compliance.quiet_hours ||
        compliance.consent_required === false;

      if (!defaultJurisdiction || defaultJurisdiction === "UNSPECIFIED" || complianceIncomplete) {
        return NextResponse.json({ ok: false, reason: "enterprise_configuration_incomplete" }, { status: 422 });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
}

