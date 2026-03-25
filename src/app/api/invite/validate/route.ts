/**
 * GET /api/invite/validate?token= — Validate invite token and return workspace + inviter for display.
 * Does not consume the token.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const db = getDb();
  const { data: invite } = await db
    .from("workspace_invites")
    .select("id, workspace_id, email, role, status, expires_at, invited_by")
    .eq("invite_token", token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "invalid" }, { status: 404 });
  const inv = invite as { id: string; workspace_id: string; email: string | null; status: string | null; expires_at: string | null; invited_by: string | null };
  if (inv.status !== "pending") return NextResponse.json({ error: "invalid" }, { status: 409 });
  if (inv.expires_at && new Date(inv.expires_at) <= new Date()) return NextResponse.json({ error: "expired" }, { status: 410 });

  const [{ data: ws }, { data: inviter }] = await Promise.all([
    db.from("workspaces").select("name").eq("id", inv.workspace_id).maybeSingle(),
    inv.invited_by ? db.from("users").select("email").eq("id", inv.invited_by).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const workspaceName = (ws as { name?: string } | null)?.name?.trim() ?? "The workspace";
  const inviterEmail = (inviter as { email?: string } | null)?.email ?? "";
  const inviterName = inviterEmail ? inviterEmail.split("@")[0]?.replace(/[._-]/g, " ") ?? "A team member" : "A team member";
  const inviterNameCap = inviterName ? inviterName.charAt(0).toUpperCase() + inviterName.slice(1) : inviterName;

  return NextResponse.json({
    ok: true,
    workspaceName,
    inviterName: inviterNameCap,
    email: inv.email ?? undefined,
  });
}
