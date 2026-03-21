import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  try {
  const db = getDb();
  const { data: members } = await db
    .from("workspace_members")
    .select("id, user_id, role, status, created_at, users(email, name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  const formatted = (members ?? []).map((m: Record<string, unknown>) => {
    const users = m.users as { name?: string; email?: string } | null;
    return {
      name: users?.name || users?.email?.split("@")[0] || "Team member",
      email: users?.email || "",
      role: (m.role as string) || "member",
      status: (m.status as string) || "active",
    };
  });

  // Fallback: if no members found, return current session user
  if (formatted.length === 0 && session?.userId) {
    const { data: user } = await db.from("users").select("email, name").eq("id", session.userId).maybeSingle();
    const u = user as { email?: string; name?: string } | null;
    if (u?.email) {
      formatted.push({
        name: u.name || u.email.split("@")[0],
        email: u.email,
        role: "owner",
        status: "active",
      });
    }
  }

  return NextResponse.json({ members: formatted });
  } catch (err) {
    console.error("[workspace-members]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ members: [] }, { status: 500 });
  }
}
