/**
 * Phone Continuity: proxy, BYON, or limited mode
 */

export const dynamic = "force-dynamic";

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
    .from("phone_configs")
    .select("*")
    .eq("workspace_id", id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[workspaces/[id]/phone-continuity GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const cfg = data as { mode?: string; proxy_number?: string; forwarding_number?: string; status?: string } | null;
  const status =
    cfg?.status === "active"
      ? "Active"
      : cfg?.status === "pending"
        ? "Decision owner required"
        : "Limited";

  return NextResponse.json({
    mode: cfg?.mode ?? "limited",
    proxy_number: cfg?.proxy_number ?? null,
    forwarding_number: cfg?.forwarding_number ?? null,
    status,
    coverage: cfg?.status === "active" ? "full" : "limited",
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authErrPut = await requireWorkspaceAccess(req, id);
  if (authErrPut) return authErrPut;
  let body: { mode?: string; forwarding_number?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const mode = body.mode ?? "proxy";
  const forwardingNumber = body.forwarding_number?.replace(/\D/g, "").slice(-10) || null;

  const { data, error } = await db
    .from("phone_configs")
    .upsert(
      {
        workspace_id: id,
        mode,
        forwarding_number: forwardingNumber,
        status: forwardingNumber ? "pending" : "limited",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error("[workspaces/[id]/phone-continuity PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}
