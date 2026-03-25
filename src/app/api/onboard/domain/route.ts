/**
 * POST /api/onboard/domain — set domain pack for workspace (optional step).
 * When session is enabled, requires workspace access (owner or role).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

const ALLOWED_DOMAINS = ["real_estate", "clinic", "finance", "recruiting", "home_services", "generic"] as const;

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
  const domain = domainType && ALLOWED_DOMAINS.includes(domainType as (typeof ALLOWED_DOMAINS)[number])
    ? domainType === "generic"
      ? "general"
      : domainType
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
