export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

interface SubAccountUpdate {
  plan?: string;
  status?: string;
  monthly_calls_limit?: number;
  monthly_leads_limit?: number;
  custom_limits?: Record<string, unknown>;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  const { id } = await params;
  const db = getDb();
  const { data: relationship, error: relError } = await db
    .from("reseller_relationships")
    .select("*")
    .eq("id", id)
    .eq("parent_workspace_id", session.workspaceId)
    .maybeSingle();

  if (relError || !relationship) {
    return NextResponse.json({ error: "Sub-account not found" }, { status: 404 });
  }

  const { data: workspace } = await db
    .from("workspaces")
    .select("id, name, created_at, status")
    .eq("id", (relationship as { child_workspace_id: string }).child_workspace_id)
    .maybeSingle();

  const { data: analytics } = await db
    .from("reseller_analytics")
    .select("*")
    .eq("workspace_id", (relationship as { child_workspace_id: string }).child_workspace_id)
    .order("month", { ascending: false })
    .limit(12);

  return NextResponse.json({
    sub_account: {
      ...relationship,
      workspace,
      analytics: analytics ?? [],
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  const { id } = await params;

  let body: SubAccountUpdate;
  try {
    body = (await req.json()) as SubAccountUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();

  const { data: relationship, error: checkError } = await db
    .from("reseller_relationships")
    .select("id")
    .eq("id", id)
    .eq("parent_workspace_id", session.workspaceId)
    .maybeSingle();

  if (checkError || !relationship) {
    return NextResponse.json({ error: "Sub-account not found" }, { status: 404 });
  }

  const { data, error } = await db
    .from("reseller_relationships")
    .update({
      plan: body.plan,
      status: body.status,
      monthly_calls_limit: body.monthly_calls_limit,
      monthly_leads_limit: body.monthly_leads_limit,
      custom_limits: body.custom_limits,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to update sub-account" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sub_account: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  const { id } = await params;
  const db = getDb();

  const { data: relationship, error: checkError } = await db
    .from("reseller_relationships")
    .select("id, child_workspace_id")
    .eq("id", id)
    .eq("parent_workspace_id", session.workspaceId)
    .maybeSingle();

  if (checkError || !relationship) {
    return NextResponse.json({ error: "Sub-account not found" }, { status: 404 });
  }

  const { error: delError } = await db
    .from("reseller_relationships")
    .update({ status: "deactivated", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (delError) {
    return NextResponse.json({ error: "Failed to deactivate sub-account" }, { status: 500 });
  }

  const { error: wsError } = await db
    .from("workspaces")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", (relationship as { child_workspace_id: string }).child_workspace_id);

  if (wsError) {
    return NextResponse.json({ error: "Failed to deactivate workspace" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Sub-account deactivated" });
}
