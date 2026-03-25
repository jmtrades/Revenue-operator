export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

interface SubAccountInput {
  name: string;
  owner_email: string;
  plan?: string;
  limits?: {
    monthly_calls_limit?: number;
    monthly_leads_limit?: number;
  };
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
    .from("reseller_relationships")
    .select(
      `
      id,
      child_workspace_id,
      plan,
      status,
      monthly_calls_limit,
      monthly_leads_limit,
      custom_limits,
      created_at,
      updated_at,
      child_workspace:child_workspace_id(id, name, created_at)
    `,
    )
    .eq("parent_workspace_id", session.workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load sub-accounts" }, { status: 500 });
  }

  return NextResponse.json({
    parent_workspace_id: session.workspaceId,
    sub_accounts: data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const err = await requireWorkspaceAccess(req, session.workspaceId);
  if (err) return err;

  let body: SubAccountInput;
  try {
    body = (await req.json()) as SubAccountInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, owner_email, plan = "standard", limits } = body;

  if (!name || !owner_email) {
    return NextResponse.json({ error: "name and owner_email required" }, { status: 400 });
  }

  const db = getDb();

  const childWorkspaceId = crypto.randomUUID();

  const { error: wsError } = await db.from("workspaces").insert({
    id: childWorkspaceId,
    name,
    owner_id: crypto.randomUUID(),
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (wsError) {
    return NextResponse.json({ error: "Failed to create child workspace" }, { status: 500 });
  }

  const { data: relationship, error: relError } = await db
    .from("reseller_relationships")
    .insert({
      parent_workspace_id: session.workspaceId,
      child_workspace_id: childWorkspaceId,
      plan,
      status: "active",
      monthly_calls_limit: limits?.monthly_calls_limit,
      monthly_leads_limit: limits?.monthly_leads_limit,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (relError) {
    return NextResponse.json({ error: "Failed to create sub-account relationship" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sub_account: relationship }, { status: 201 });
}
