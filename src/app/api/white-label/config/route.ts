export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

interface WhiteLabelConfig {
  brand_name?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  custom_domain?: string | null;
  support_email?: string | null;
  support_url?: string | null;
  powered_by_hidden?: boolean;
  custom_css?: string | null;
  login_background_url?: string | null;
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  const db = getDb();
  const { data, error } = await db
    .from("white_label_config")
    .select("*")
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();

  const pgCode =
    error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
  if (error && pgCode !== "PGRST116") {
    return NextResponse.json({ error: "Failed to load white-label config" }, { status: 500 });
  }

  return NextResponse.json({
    workspace_id: session.workspaceId,
    config: data ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  const { canUseFeature } = await import("@/lib/billing/plan-enforcement");
  const gate = await canUseFeature(session.workspaceId, "whiteLabel");
  if (!gate.allowed) {
    return NextResponse.json({
      error: gate.message ?? "White-label customization requires the Enterprise plan.",
      upgradeTo: gate.upgradeTo,
    }, { status: 403 });
  }

  let body: WhiteLabelConfig;
  try {
    body = (await req.json()) as WhiteLabelConfig;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const { data, error } = await db
    .from("white_label_config")
    .upsert(
      {
        workspace_id: session.workspaceId,
        brand_name: body.brand_name,
        logo_url: body.logo_url,
        favicon_url: body.favicon_url,
        primary_color: body.primary_color ?? "#3B82F6",
        secondary_color: body.secondary_color ?? "#10B981",
        accent_color: body.accent_color ?? "#F59E0B",
        custom_domain: body.custom_domain,
        support_email: body.support_email,
        support_url: body.support_url,
        powered_by_hidden: body.powered_by_hidden ?? false,
        custom_css: body.custom_css,
        login_background_url: body.login_background_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" },
    )
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to save white-label config" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, config: data ?? null });
}
