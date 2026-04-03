/**
 * POST /api/onboard/domain — set domain pack for workspace (optional step).
 * When session is enabled, requires workspace access (owner or role).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

/** Map any industry to the closest domain pack for compliance/strategy config. */
const DOMAIN_MAPPING: Record<string, string> = {
  real_estate: "real_estate",
  property_mgmt: "real_estate",
  clinic: "clinic",
  healthcare: "clinic",
  dental: "clinic",
  medical: "clinic",
  veterinary: "clinic",
  mental_health: "clinic",
  spa: "clinic",
  fitness: "clinic",
  senior_care: "clinic",
  finance: "finance",
  financial_services: "finance",
  insurance: "finance",
  accounting: "finance",
  recruiting: "recruiting",
  home_services: "home_services",
  plumbing: "home_services",
  hvac: "home_services",
  electrical: "home_services",
  roofing: "home_services",
  landscaping: "home_services",
  cleaning: "home_services",
  construction: "home_services",
  contractors: "home_services",
  solar: "home_services",
  moving: "home_services",
  security: "home_services",
  legal: "home_services",
  auto: "home_services",
  generic: "general",
};

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  let body: { workspace_id?: string; domain_type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const workspaceId = body.workspace_id?.trim();
  const domainType = body.domain_type?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;
  const domain = domainType
    ? DOMAIN_MAPPING[domainType] ?? "general"
    : "general";

  const db = getDb();
  await db.from("domain_packs").delete().eq("workspace_id", workspaceId);
  await db.from("domain_packs").insert({
    workspace_id: workspaceId,
    domain_type: domain,
    config_json: { default_jurisdiction: "UK" },
  });
  return NextResponse.json({ ok: true, domain_type: domain });
}
