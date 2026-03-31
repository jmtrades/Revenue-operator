/**
 * Set workspace industry for vertical-specific templates and onboarding
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const body = await req.json().catch(() => ({})) as { workspace_id?: string; industry?: string };
  const workspaceId = body.workspace_id;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const industry = body.industry;
  if (!industry || typeof industry !== "string" || industry.length > 100) {
    return NextResponse.json({ error: "Invalid industry" }, { status: 400 });
  }

  const db = getDb();

  // Update workspace industry
  const { error } = await db
    .from("workspaces")
    .update({ industry })
    .eq("id", workspaceId);

  if (error) return NextResponse.json({ error: "Could not update workspace settings. Please try again." }, { status: 500 });

  // Return the industry template if one exists
  const { data: template } = await db
    .from("industry_templates")
    .select("industry_slug, name, default_greeting, default_scripts, default_faq, default_follow_up_cadence, recommended_features")
    .eq("industry_slug", industry)
    .maybeSingle();

  return NextResponse.json({ ok: true, industry, template: template ?? null });
}
